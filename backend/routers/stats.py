from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
def get_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_alerts = db.query(models.Alert).count()
    unresolved_alerts = db.query(models.Alert).filter_by(is_resolved=False).count()

    severity_rows = (
        db.query(models.Alert.severity, func.count(models.Alert.id))
        .group_by(models.Alert.severity)
        .all()
    )
    alerts_by_severity = {severity: count for severity, count in severity_rows}

    cutoff = datetime.utcnow() - timedelta(hours=24)
    alerts_last_24h = db.query(models.Alert).filter(models.Alert.created_at >= cutoff).count()

    active_rules = db.query(models.Rule).filter_by(is_active=True).count()
    total_folders = db.query(models.WebFolder).count()
    total_log_sources = db.query(models.LogSource).count()

    top_risk_records = (
        db.query(models.IPReputationCache)
        .order_by(models.IPReputationCache.risk_score.desc())
        .limit(5)
        .all()
    )
    top_risk_ips = [
        {"ip_address": record.ip_address, "risk_score": record.risk_score}
        for record in top_risk_records
    ]

    return {
        "total_alerts": total_alerts,
        "unresolved_alerts": unresolved_alerts,
        "alerts_by_severity": alerts_by_severity,
        "alerts_last_24h": alerts_last_24h,
        "active_rules": active_rules,
        "total_folders": total_folders,
        "total_log_sources": total_log_sources,
        "top_risk_ips": top_risk_ips,
    }
