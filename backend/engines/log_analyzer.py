import base64
import html
import re
from datetime import datetime, timedelta
from urllib.parse import unquote

from database import SessionLocal
from engines.alert_manager import receiveFinding
import models

# module-level trackers for frequency-based detections; these live only in
# memory for as long as the server process runs (not persisted to the DB),
# since they only matter for spotting an ongoing burst, not for surviving a restart
_repeated404History = {}
_repeated404LastAlert = {}
_sshFailureHistory = {}
_sshLastAlert = {}


def readNewLines(filePath, lastOffset):
    with open(filePath, "r") as f:
        f.seek(lastOffset)
        newLines = f.readlines()
        newOffset = f.tell()

    return newLines, newOffset


def loadActiveRules(db):
    return db.query(models.Rule).filter_by(is_active=True).all()


def normalizeLine(line):
    decodedLine = unquote(line)
    decodedLine = html.unescape(decodedLine)
    return decodedLine


def matchRules(line, rules):
    normalizedLine = normalizeLine(line)
    matchedRules = []

    for rule in rules:
        if re.search(rule.pattern, normalizedLine, re.IGNORECASE):
            matchedRules.append(rule)

    return matchedRules


def detectBase64Payload(line, rules):
    candidates = re.findall(r"[A-Za-z0-9+/]{20,}={0,2}", line)

    for candidate in candidates:
        try:
            decodedBytes = base64.b64decode(candidate, validate=True)
            decodedText = decodedBytes.decode("utf-8", errors="ignore")
        except Exception:
            continue

        matchedRules = matchRules(decodedText, rules)
        if matchedRules:
            return decodedText, matchedRules

    return None, []


def cooldown(ipAddress, timestamp, lastAlertTracker, cooldownSeconds=60):
    lastAlert = lastAlertTracker.get(ipAddress)
    if lastAlert is not None and (timestamp - lastAlert).total_seconds() < cooldownSeconds:
        return False

    lastAlertTracker[ipAddress] = timestamp
    return True


def extractIp(line):
    match = re.match(r"(\d+\.\d+\.\d+\.\d+)", line)
    if match:
        return match.group(1)

    return None


SEVERITY_POINTS = {"low": 1, "medium": 3, "high": 5}


def updateRiskScore(ipAddress, severity, db):
    points = SEVERITY_POINTS.get(severity, 1)

    record = db.query(models.IPReputationCache).filter_by(ip_address=ipAddress).first()
    if record is None:
        record = models.IPReputationCache(ip_address=ipAddress, risk_score=points)
        db.add(record)
    else:
        record.risk_score += points

    db.commit()
    return record.risk_score


def parseFailedLogin(line):
    match = re.search(
        r"^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}).*Failed password for "
        r"(?:invalid user )?\S+ from (\d+\.\d+\.\d+\.\d+)",
        line,
    )
    if not match:
        return None

    timestampStr = match.group(1)
    ipAddress = match.group(2)

    currentYear = datetime.now().year
    timestamp = datetime.strptime(f"{currentYear} {timestampStr}", "%Y %b %d %H:%M:%S")

    return {"timestamp": timestamp, "ip_address": ipAddress}


def parseAccessLogLine(line):
    match = re.search(
        r"^(\d+\.\d+\.\d+\.\d+).*?\[(\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2})\s[+-]\d{4}\].*?\"\s(\d{3})\s",
        line,
    )
    if not match:
        return None

    ipAddress = match.group(1)
    timestampStr = match.group(2)
    statusCode = int(match.group(3))

    timestamp = datetime.strptime(timestampStr, "%d/%b/%Y:%H:%M:%S")

    return {"ip_address": ipAddress, "timestamp": timestamp, "status_code": statusCode}


def checkBruteForce(ipAddress, timestamp, failureHistory, windowSeconds=60, threshold=5):
    if ipAddress not in failureHistory:
        failureHistory[ipAddress] = []

    failureHistory[ipAddress].append(timestamp)

    cutoff = timestamp - timedelta(seconds=windowSeconds)
    recentFailures = [t for t in failureHistory[ipAddress] if t >= cutoff]
    failureHistory[ipAddress] = recentFailures

    return len(recentFailures) >= threshold


def analyzeLogSource(logSource, db):
    rules = loadActiveRules(db)
    newLines, newOffset = readNewLines(logSource.path, logSource.last_read_offset)

    for line in newLines:
        ipAddress = extractIp(line)

        matchedRules = matchRules(line, rules)
        for rule in matchedRules:
            receiveFinding(
                db, message=f"{rule.name} matched: {line.strip()}", severity=rule.severity,
                mitreTechnique=rule.mitre_technique, ruleId=rule.id, logSourceId=logSource.id, ipAddress=ipAddress,
            )
            if ipAddress:
                updateRiskScore(ipAddress, rule.severity, db)

        decodedText, base64MatchedRules = detectBase64Payload(line, rules)
        for rule in base64MatchedRules:
            receiveFinding(
                db, message=f"{rule.name} (base64-decoded) matched: {decodedText!r}", severity=rule.severity,
                mitreTechnique=rule.mitre_technique, ruleId=rule.id, logSourceId=logSource.id, ipAddress=ipAddress,
            )
            if ipAddress:
                updateRiskScore(ipAddress, rule.severity, db)

        parsed = parseAccessLogLine(line)
        if parsed and parsed["status_code"] == 404:
            isScanning = checkBruteForce(
                parsed["ip_address"], parsed["timestamp"], _repeated404History,
                windowSeconds=60, threshold=5,
            )
            if isScanning and cooldown(
                parsed["ip_address"], parsed["timestamp"], _repeated404LastAlert
            ):
                receiveFinding(
                    db, message=f"IP {parsed['ip_address']} triggered 5+ 404s within 60s", severity="medium",
                    mitreTechnique="T1595", logSourceId=logSource.id, ipAddress=parsed["ip_address"],
                )
                updateRiskScore(parsed["ip_address"], "medium", db)

    logSource.last_read_offset = newOffset
    db.commit()


def analyzeSshLogSource(logSource, db):
    newLines, newOffset = readNewLines(logSource.path, logSource.last_read_offset)

    for line in newLines:
        parsed = parseFailedLogin(line)
        if parsed is None:
            continue

        isBruteForce = checkBruteForce(
            parsed["ip_address"], parsed["timestamp"], _sshFailureHistory,
            windowSeconds=60, threshold=5,
        )
        if isBruteForce and cooldown(
            parsed["ip_address"], parsed["timestamp"], _sshLastAlert
        ):
            receiveFinding(
                db, message=f"IP {parsed['ip_address']} triggered 5+ failed SSH logins within 60s", severity="high",
                mitreTechnique="T1110", logSourceId=logSource.id, ipAddress=parsed["ip_address"],
            )
            updateRiskScore(parsed["ip_address"], "high", db)

    logSource.last_read_offset = newOffset
    db.commit()


def runScheduledLogScan(logSourceId):
    db = SessionLocal()

    logSource = db.query(models.LogSource).filter_by(id=logSourceId).first()
    analyzeLogSource(logSource, db)

    db.close()


def runScheduledSshScan(logSourceId):
    db = SessionLocal()

    logSource = db.query(models.LogSource).filter_by(id=logSourceId).first()
    analyzeSshLogSource(logSource, db)

    db.close()
