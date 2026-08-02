from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# ---------- User ----------
class UserBase(BaseModel):
    username: str
    email: str


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- WebFolder ----------
class WebFolderBase(BaseModel):
    name: str
    path: str


class WebFolderCreate(WebFolderBase):
    pass


class WebFolderRead(WebFolderBase):
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- FileHash ----------
class FileHashBase(BaseModel):
    file_path: str
    file_hash: str


class FileHashCreate(FileHashBase):
    folder_id: int
    last_modified: Optional[datetime] = None


class FileHashRead(FileHashBase):
    id: int
    folder_id: int
    last_modified: Optional[datetime] = None
    last_checked: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- LogSource ----------
class LogSourceBase(BaseModel):
    name: str
    path: str
    source_type: str = "custom"


class LogSourceCreate(LogSourceBase):
    folder_id: Optional[int] = None


class LogSourceRead(LogSourceBase):
    id: int
    folder_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Rule ----------
class RuleBase(BaseModel):
    name: str
    pattern: str
    severity: Severity = Severity.medium
    mitre_technique: Optional[str] = None
    description: Optional[str] = None


class RuleCreate(RuleBase):
    pass


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    pattern: Optional[str] = None
    severity: Optional[Severity] = None
    mitre_technique: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RuleRead(RuleBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Alert ----------
class AlertBase(BaseModel):
    message: str
    severity: Severity = Severity.medium
    ip_address: Optional[str] = None


class AlertCreate(AlertBase):
    rule_id: Optional[int] = None
    log_source_id: Optional[int] = None


class AlertUpdate(BaseModel):
    is_resolved: bool


class AlertRead(AlertBase):
    id: int
    rule_id: Optional[int] = None
    log_source_id: Optional[int] = None
    is_resolved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- IPReputationCache ----------
class IPReputationBase(BaseModel):
    ip_address: str
    abuse_confidence_score: int = 0
    country_code: Optional[str] = None
    is_malicious: bool = False


class IPReputationRead(IPReputationBase):
    id: int
    last_checked: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
