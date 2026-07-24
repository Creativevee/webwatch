from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login():
    return {"message": "login endpoint not yet implemented"}


@router.post("/logout")
def logout():
    return {"message": "logout endpoint not yet implemented"}
