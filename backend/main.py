from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from engines.file_monitor import run_scheduled_scan, start_watching
from routers import auth, alerts, folders

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        run_scheduled_scan,
        "interval",
        seconds=30,
        kwargs={"folder_id": 1, "folder_path": "../monitored"},
    )
    scheduler.start()

    observer = start_watching("../monitored")

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


@app.get("/")
def read_root():
    return {"message": "Hello, WebWatch!"}
