from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertRead])
def list_alerts(
    severity: Optional[str] = None,
    category: Optional[str] = None,
    ip_address: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)

    if severity:
        query = query.filter(models.Alert.severity == severity)

    if category == "file":
        query = query.filter(models.Alert.log_source_id.is_(None))
    elif category == "log":
        query = query.filter(models.Alert.log_source_id.isnot(None))

    if ip_address:
        query = query.filter(models.Alert.ip_address == ip_address)

    if start_date:
        query = query.filter(models.Alert.created_at >= start_date)

    if end_date:
        query = query.filter(models.Alert.created_at <= end_date)

    query = query.order_by(models.Alert.created_at.desc())

    return query.offset(skip).limit(limit).all()


@router.get("/{alert_id}", response_model=schemas.AlertRead)
def get_alert(
    alert_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(models.Alert).filter_by(id=alert_id).first()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alert


@router.put("/{alert_id}", response_model=schemas.AlertRead)
def update_alert(
    alert_id: int,
    alert_update: schemas.AlertUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(models.Alert).filter_by(id=alert_id).first()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = alert_update.is_resolved
    db.commit()
    db.refresh(alert)

    return alert


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(models.Alert).filter_by(id=alert_id).first()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()

    return {"message": "Alert deleted"}
