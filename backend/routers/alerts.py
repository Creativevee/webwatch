from fastapi import APIRouter

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts():
    return []
