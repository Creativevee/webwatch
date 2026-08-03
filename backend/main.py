from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from engines.file_monitor import runScheduledScan, startWatching
from engines.log_analyzer import runScheduledLogScan, runScheduledSshScan
from routers import auth, alerts, folders, logs, rules, stats

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        runScheduledScan,
        "interval",
        seconds=20,
        kwargs={"folderId": 1, "folderPath": "../monitored"},
    )
    scheduler.add_job(
        runScheduledLogScan,
        "interval",
        seconds=20,
        kwargs={"logSourceId": 1},
    )
    scheduler.add_job(
        runScheduledSshScan,
        "interval",
        seconds=20,
        kwargs={"logSourceId": 2},
    )
    scheduler.start()

    observer = startWatching("../monitored")

    yield

    scheduler.shutdown()
    observer.stop()
    observer.join()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/")
def read_root():
    return {"message": "Hello, WebWatch!"}
