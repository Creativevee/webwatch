from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from engines.log_analyzer import tailLines
import models
import schemas
from routers.auth import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.post("", response_model=schemas.LogSourceRead)
def create_log_source(
    log_source: schemas.LogSourceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_log_source = models.LogSource(
        name=log_source.name,
        path=log_source.path,
        source_type=log_source.source_type,
        folder_id=log_source.folder_id,
    )
    db.add(new_log_source)
    db.commit()
    db.refresh(new_log_source)
    return new_log_source


@router.get("", response_model=list[schemas.LogSourceRead])
def list_log_sources(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.LogSource).all()


@router.get("/{log_id}/tail")
def tail_log_source(
    log_id: int,
    lines: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_source = db.query(models.LogSource).filter_by(id=log_id).first()

    if log_source is None:
        raise HTTPException(status_code=404, detail="Log source not found")

    try:
        recentLines = tailLines(log_source.path, maxLines=lines)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Log file not found on disk")

    return {"lines": [line.rstrip("\n") for line in recentLines]}


@router.delete("/{log_id}")
def delete_log_source(
    log_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_source = db.query(models.LogSource).filter_by(id=log_id).first()

    if log_source is None:
        raise HTTPException(status_code=404, detail="Log source not found")

    db.delete(log_source)
    db.commit()

    return {"message": "Log source deleted"}
