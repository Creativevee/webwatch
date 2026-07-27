import hashlib
import os
import time
from datetime import datetime

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

import models
from database import SessionLocal


def hash_file(file_path):
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    hash_object = hashlib.sha256(file_bytes)
    return hash_object.hexdigest()


def scan_folder(folder_path):
    file_hashes = {}

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            file_path = os.path.join(root, filename)
            file_hashes[file_path] = hash_file(file_path)

    return file_hashes


def save_baseline(folder_id, file_hashes, db):
    for file_path, file_hash in file_hashes.items():
        record = models.FileHash(
            folder_id=folder_id,
            file_path=file_path,
            file_hash=file_hash,
        )
        db.add(record)

    db.commit()


def get_stored_hashes(folder_id, db):
    records = db.query(models.FileHash).filter_by(folder_id=folder_id).all()

    stored_hashes = {}
    for record in records:
        stored_hashes[record.file_path] = record.file_hash

    return stored_hashes


def detect_changes(stored_hashes, current_hashes):
    stored_paths = set(stored_hashes.keys())
    current_paths = set(current_hashes.keys())

    added_paths = current_paths - stored_paths
    deleted_paths = stored_paths - current_paths
    common_paths = stored_paths & current_paths

    modified = []
    for path in common_paths:
        if stored_hashes[path] != current_hashes[path]:
            modified.append(path)

    # look for renames: a "deleted" file whose hash matches an "added" file
    deleted_hash_lookup = {}
    for path in deleted_paths:
        deleted_hash_lookup[stored_hashes[path]] = path

    renamed = []
    matched_old_paths = set()
    matched_new_paths = set()

    for new_path in added_paths:
        file_hash = current_hashes[new_path]
        if file_hash in deleted_hash_lookup:
            old_path = deleted_hash_lookup[file_hash]
            renamed.append({"old_path": old_path, "new_path": new_path})
            matched_old_paths.add(old_path)
            matched_new_paths.add(new_path)

    added = []
    for path in added_paths:
        if path not in matched_new_paths:
            added.append(path)

    deleted = []
    for path in deleted_paths:
        if path not in matched_old_paths:
            deleted.append(path)

    return {
        "added": added,
        "deleted": deleted,
        "modified": modified,
        "renamed": renamed,
    }


def log_event(event_type, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{event_type}] {message}")


def update_baseline(folder_id, current_hashes, db):
    existing_records = db.query(models.FileHash).filter_by(folder_id=folder_id).all()
    existing_by_path = {record.file_path: record for record in existing_records}

    for file_path, file_hash in current_hashes.items():
        if file_path in existing_by_path:
            existing_by_path[file_path].file_hash = file_hash
        else:
            db.add(
                models.FileHash(
                    folder_id=folder_id,
                    file_path=file_path,
                    file_hash=file_hash,
                )
            )

    for file_path, record in existing_by_path.items():
        if file_path not in current_hashes:
            db.delete(record)

    db.commit()


def run_scheduled_scan(folder_id, folder_path):
    db = SessionLocal()

    current_hashes = scan_folder(folder_path)
    stored_hashes = get_stored_hashes(folder_id, db)
    changes = detect_changes(stored_hashes, current_hashes)

    for path in changes["added"]:
        log_event("ADDED", path)

    for path in changes["deleted"]:
        log_event("DELETED", path)

    for path in changes["modified"]:
        log_event("MODIFIED", path)

    for r in changes["renamed"]:
        log_event("RENAMED", f"{r['new_path']}(new) > {r['old_path']}(old)")

    update_baseline(folder_id, current_hashes, db)

    db.close()


class ChangeHandler(FileSystemEventHandler):
    def __init__(self, cooldown_seconds=1):
        self.cooldown_seconds = cooldown_seconds
        self.last_event_time = {}

    def _is_duplicate(self, path, event_type):
        key = (path, event_type)
        now = time.time()
        last_time = self.last_event_time.get(key)

        self.last_event_time[key] = now

        if last_time is not None and (now - last_time) < self.cooldown_seconds:
            return True

        return False

    def on_created(self, event):
        if not event.is_directory and not self._is_duplicate(event.src_path, "ADDED"):
            log_event("ADDED", event.src_path)

    def on_modified(self, event):
        if not event.is_directory and not self._is_duplicate(event.src_path, "MODIFIED"):
            log_event("MODIFIED", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory and not self._is_duplicate(event.src_path, "DELETED"):
            log_event("DELETED", event.src_path)

    def on_moved(self, event):
        if not event.is_directory and not self._is_duplicate(event.dest_path, "RENAMED"):
            log_event("RENAMED", f"{event.dest_path}(new) > {event.src_path}(old)")


def start_watching(folder_path):
    event_handler = ChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, folder_path, recursive=True)
    observer.start()
    return observer


def watch_folder(folder_path):
    observer = start_watching(folder_path)

    print("Watching for real-time file changes... (Ctrl+C to stop)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()


if __name__ == "__main__":
    watch_folder("../monitored")
