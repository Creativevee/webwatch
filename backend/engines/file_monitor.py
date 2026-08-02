import hashlib
import os
import time

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from database import SessionLocal
from engines.alert_manager import receiveFinding
import models

SEVERITY_BY_EVENT_TYPE = {
    "ADDED": "medium",
    "MODIFIED": "high",
    "DELETED": "high",
    "RENAMED": "medium",
}


def hashFile(filePath):
    with open(filePath, "rb") as f:
        fileBytes = f.read()

    hashObject = hashlib.sha256(fileBytes)
    return hashObject.hexdigest()


def scanFolder(folderPath):
    fileHashes = {}

    for root, dirs, files in os.walk(folderPath):
        for filename in files:
            filePath = os.path.join(root, filename)
            fileHashes[filePath] = hashFile(filePath)

    return fileHashes


def saveBaseline(folderId, fileHashes, db):
    for filePath, fileHash in fileHashes.items():
        record = models.FileHash(
            folder_id=folderId,
            file_path=filePath,
            file_hash=fileHash,
        )
        db.add(record)

    db.commit()


def getStoredHashes(folderId, db):
    records = db.query(models.FileHash).filter_by(folder_id=folderId).all()

    storedHashes = {}
    for record in records:
        storedHashes[record.file_path] = record.file_hash

    return storedHashes


def detectChanges(storedHashes, currentHashes):
    storedPaths = set(storedHashes.keys())
    currentPaths = set(currentHashes.keys())

    addedPaths = currentPaths - storedPaths
    deletedPaths = storedPaths - currentPaths
    commonPaths = storedPaths & currentPaths

    modified = []
    for path in commonPaths:
        if storedHashes[path] != currentHashes[path]:
            modified.append(path)

    # look for renames: a "deleted" file whose hash matches an "added" file
    deletedHashLookup = {}
    for path in deletedPaths:
        deletedHashLookup[storedHashes[path]] = path

    renamed = []
    matchedOldPaths = set()
    matchedNewPaths = set()

    for newPath in addedPaths:
        fileHash = currentHashes[newPath]
        if fileHash in deletedHashLookup:
            oldPath = deletedHashLookup[fileHash]
            renamed.append({"old_path": oldPath, "new_path": newPath})
            matchedOldPaths.add(oldPath)
            matchedNewPaths.add(newPath)

    added = []
    for path in addedPaths:
        if path not in matchedNewPaths:
            added.append(path)

    deleted = []
    for path in deletedPaths:
        if path not in matchedOldPaths:
            deleted.append(path)

    return {
        "added": added,
        "deleted": deleted,
        "modified": modified,
        "renamed": renamed,
    }


def reportFinding(eventType, message, db):
    severity = SEVERITY_BY_EVENT_TYPE.get(eventType, "medium")
    receiveFinding(db, message=f"[{eventType}] {message}", severity=severity)


def updateBaseline(folderId, currentHashes, db):
    existingRecords = db.query(models.FileHash).filter_by(folder_id=folderId).all()
    existingByPath = {record.file_path: record for record in existingRecords}

    for filePath, fileHash in currentHashes.items():
        if filePath in existingByPath:
            existingByPath[filePath].file_hash = fileHash
        else:
            db.add(
                models.FileHash(
                    folder_id=folderId,
                    file_path=filePath,
                    file_hash=fileHash,
                )
            )

    for filePath, record in existingByPath.items():
        if filePath not in currentHashes:
            db.delete(record)

    db.commit()


def runScheduledScan(folderId, folderPath):
    db = SessionLocal()

    currentHashes = scanFolder(folderPath)
    storedHashes = getStoredHashes(folderId, db)
    changes = detectChanges(storedHashes, currentHashes)

    for path in changes["added"]:
        reportFinding("ADDED", path, db)

    for path in changes["deleted"]:
        reportFinding("DELETED", path, db)

    for path in changes["modified"]:
        reportFinding("MODIFIED", path, db)

    for r in changes["renamed"]:
        reportFinding("RENAMED", f"{r['new_path']}(new) > {r['old_path']}(old)", db)

    updateBaseline(folderId, currentHashes, db)

    db.close()


class ChangeHandler(FileSystemEventHandler):
    def __init__(self, cooldownSeconds=1):
        self.cooldownSeconds = cooldownSeconds
        self.lastEventTime = {}

    def _isDuplicate(self, path, eventType):
        key = (path, eventType)
        now = time.time()
        lastTime = self.lastEventTime.get(key)

        self.lastEventTime[key] = now

        if lastTime is not None and (now - lastTime) < self.cooldownSeconds:
            return True

        return False

    def on_created(self, event):
        if not event.is_directory and not self._isDuplicate(event.src_path, "ADDED"):
            db = SessionLocal()
            reportFinding("ADDED", event.src_path, db)
            db.close()

    def on_modified(self, event):
        if not event.is_directory and not self._isDuplicate(event.src_path, "MODIFIED"):
            db = SessionLocal()
            reportFinding("MODIFIED", event.src_path, db)
            db.close()

    def on_deleted(self, event):
        if not event.is_directory and not self._isDuplicate(event.src_path, "DELETED"):
            db = SessionLocal()
            reportFinding("DELETED", event.src_path, db)
            db.close()

    def on_moved(self, event):
        if not event.is_directory and not self._isDuplicate(event.dest_path, "RENAMED"):
            db = SessionLocal()
            reportFinding("RENAMED", f"{event.dest_path}(new) > {event.src_path}(old)", db)
            db.close()


def startWatching(folderPath):
    eventHandler = ChangeHandler()
    observer = Observer()
    observer.schedule(eventHandler, folderPath, recursive=True)
    observer.start()
    return observer


def watchFolder(folderPath):
    observer = startWatching(folderPath)

    print("Watching for real-time file changes... (Ctrl+C to stop)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()


if __name__ == "__main__":
    watchFolder("../monitored")
