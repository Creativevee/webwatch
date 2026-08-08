import csv
import subprocess
import time
from datetime import datetime, timezone

import requests

from playbook import HTTP_SCENARIOS, SPECIAL_SCENARIOS, TARGETS

API_BASE = "http://192.168.1.17:8000"
WAIT_SECONDS = 12
RUNS = 3


def login():
    response = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def getAlertsSince(token, sinceTime):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"start_date": sinceTime.isoformat(), "limit": 100}
    response = requests.get(f"{API_BASE}/api/alerts", headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def fireHttpScenario(scenario, targetUrl):
    extraArgs = scenario.get("extra_args", [])
    url = f"{targetUrl}{scenario['path']}"
    command = ["curl", "-s", "-g", "-o", "/dev/null", "-w", "%{http_code}"] + extraArgs + [url]
    result = subprocess.run(command, capture_output=True, text=True)
    return result.stdout.strip()


def checkFail2banBanCount():
    result = subprocess.run(
        ["sudo", "fail2ban-client", "status", "sshd"], capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        if "Total banned:" in line:
            return int(line.split(":")[1].strip())
    return 0


def earliestAlertTime(alerts):
    if not alerts:
        return None
    times = [
        datetime.fromisoformat(alert["created_at"].replace("Z", "+00:00"))
        for alert in alerts
    ]
    return min(times)


def runHttpScenariosForWebwatch(token, runNumber, results):
    for scenario in HTTP_SCENARIOS:
        fireTime = datetime.now(timezone.utc)

        fireHttpScenario(scenario, TARGETS["webwatch"])
        time.sleep(WAIT_SECONDS)

        alerts = getAlertsSince(token, fireTime)
        caught = len(alerts) > 0
        alertTime = earliestAlertTime(alerts)
        latency = (alertTime - fireTime).total_seconds() if alertTime else None

        results.append(
            {
                "run": runNumber,
                "scenario": scenario["name"],
                "category": scenario["category"],
                "mitre_technique": scenario.get("mitre_technique"),
                "webwatch_caught": caught,
                "webwatch_latency_seconds": latency,
                "modsecurity_blocked": None,
                "fail2ban_caught": None,
                "aide_caught": None,
            }
        )

        status = "CAUGHT" if caught else "missed"
        print(f"Run {runNumber} - {scenario['name']}: WebWatch {status}")


def runHttpScenariosForModsecurity(runNumber, results):
    resultsByName = {
        row["scenario"]: row for row in results if row["run"] == runNumber
    }

    for scenario in HTTP_SCENARIOS:
        statusCode = fireHttpScenario(scenario, TARGETS["modsecurity"])
        blocked = statusCode == "403"

        if scenario["name"] in resultsByName:
            resultsByName[scenario["name"]]["modsecurity_blocked"] = blocked

        label = "BLOCKED" if blocked else "passed"
        print(f"Run {runNumber} - {scenario['name']}: ModSec {label} (HTTP {statusCode})")
        time.sleep(1)


def runSshBruteForce(token, runNumber, results):
    scenario = SPECIAL_SCENARIOS[0]
    fireTime = datetime.now(timezone.utc)
    banCountBefore = checkFail2banBanCount()

    subprocess.run(scenario["command"], capture_output=True)
    time.sleep(WAIT_SECONDS)

    alerts = getAlertsSince(token, fireTime)
    caught = len(alerts) > 0
    alertTime = earliestAlertTime(alerts)
    latency = (alertTime - fireTime).total_seconds() if alertTime else None
    banCountAfter = checkFail2banBanCount()

    results.append(
        {
            "run": runNumber,
            "scenario": scenario["name"],
            "category": scenario["category"],
            "mitre_technique": scenario["mitre_technique"],
            "webwatch_caught": caught,
            "webwatch_latency_seconds": latency,
            "modsecurity_blocked": None,
            "fail2ban_caught": banCountAfter > banCountBefore,
            "aide_caught": None,
        }
    )
    print(f"Run {runNumber} - SSH Brute Force: WebWatch caught={caught}, Fail2Ban caught={banCountAfter > banCountBefore}")


def runFileTamper(token, runNumber, results):
    scenario = SPECIAL_SCENARIOS[1]
    fireTime = datetime.now(timezone.utc)
    testFile = f"/etc/nginx/eval-test-{runNumber}.conf"

    subprocess.run(["sudo", "touch", testFile], capture_output=True)
    time.sleep(WAIT_SECONDS)

    alerts = getAlertsSince(token, fireTime)
    caught = len(alerts) > 0
    alertTime = earliestAlertTime(alerts)
    latency = (alertTime - fireTime).total_seconds() if alertTime else None

    aideResult = subprocess.run(
        ["sudo", "aide", "--config=/etc/aide/aide-nginx.conf", "--check"],
        capture_output=True,
        text=True,
    )
    aideCaught = testFile.split("/")[-1] in aideResult.stdout

    results.append(
        {
            "run": runNumber,
            "scenario": scenario["name"],
            "category": scenario["category"],
            "mitre_technique": scenario["mitre_technique"],
            "webwatch_caught": caught,
            "webwatch_latency_seconds": latency,
            "modsecurity_blocked": None,
            "fail2ban_caught": None,
            "aide_caught": aideCaught,
        }
    )
    print(f"Run {runNumber} - File Tamper: WebWatch caught={caught}, AIDE caught={aideCaught}")


def runEvaluation():
    token = login()
    results = []

    for runNumber in range(1, RUNS + 1):
        print(f"\n########## RUN {runNumber} of {RUNS} ##########")
        runHttpScenariosForWebwatch(token, runNumber, results)
        runHttpScenariosForModsecurity(runNumber, results)
        runSshBruteForce(token, runNumber, results)
        runFileTamper(token, runNumber, results)

    return results


def saveResults(results):
    with open("evaluation_results.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print("\nResults saved to evaluation_results.csv")


if __name__ == "__main__":
    results = runEvaluation()
    saveResults(results)
