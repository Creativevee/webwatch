import asyncio
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from watchdog.observers import Observer

from database import SessionLocal
from engines.file_monitor import ChangeHandler, scanNewFolders, syncing
from engines.log_analyzer import syncingLogs
from routers import auth, alerts, folders, logs, rules, stats, ws

scheduler = BackgroundScheduler()
observer = Observer()
changeHandler = ChangeHandler()


watchedFolders = {}
scheduledLogSourceIds = set()
scannedFolders = set()


def syncMonitoring():
    db = SessionLocal()
    syncing(observer, changeHandler, watchedFolders, db)
    syncingLogs(scheduler, scheduledLogSourceIds, db)
    scanNewFolders(scannedFolders, db)
    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ws.manager.loop = asyncio.get_running_loop()

    observer.start()
    syncMonitoring()

    scheduler.add_job(syncMonitoring, "interval", seconds=30, id="sync_monitoring")
    scheduler.start()

    yield

    scheduler.shutdown()
    observer.stop()
    observer.join()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.17:5173",
        "http://192.168.1.2:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(folders.router)
app.include_router(logs.router)
app.include_router(rules.router)
app.include_router(stats.router)
app.include_router(ws.router)


@app.get("/")
def read_root():
    return {"message": "Hello, WebWatch!"}
