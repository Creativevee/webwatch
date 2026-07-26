from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/auth", tags=["auth"])
password_hashing = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def create_access_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {"sub": username, "exp": expire}
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def get_current_user(
    auth_credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = auth_credentials.credentials

    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        username = payload.get("sub")
    except JWTError:
        raise credentials_error

    if username is None:
        raise credentials_error

    user = db.query(models.User).filter_by(username=username).first()
    if user is None:
        raise credentials_error

    return user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(username=credentials.username).first()

    if not user or not password_hashing.verify(
        credentials.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    access_token = create_access_token(user.username)
    return schemas.Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    return {"message": "logout endpoint not yet implemented"}
