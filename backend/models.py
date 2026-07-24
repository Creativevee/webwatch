from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    folders = relationship("WebFolder", back_populates="owner")


class WebFolder(Base):
    __tablename__ = "web_folders"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    path = Column(String(500), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="folders")
    file_hashes = relationship("FileHash", back_populates="folder")
    log_sources = relationship("LogSource", back_populates="folder")


class FileHash(Base):
    __tablename__ = "file_hashes"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("web_folders.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)
    last_modified = Column(DateTime, nullable=True)
    last_checked = Column(DateTime, server_default=func.now())

    folder = relationship("WebFolder", back_populates="file_hashes")


class LogSource(Base):
    __tablename__ = "log_sources"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("web_folders.id"), nullable=True)
    name = Column(String(100), nullable=False)
    path = Column(String(500), nullable=False)
    source_type = Column(String(50), default="custom")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    folder = relationship("WebFolder", back_populates="log_sources")
    alerts = relationship("Alert", back_populates="log_source")


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    pattern = Column(String(500), nullable=False)
    severity = Column(String(20), default="medium")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    alerts = relationship("Alert", back_populates="rule")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id"), nullable=True)
    log_source_id = Column(Integer, ForeignKey("log_sources.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    rule = relationship("Rule", back_populates="alerts")
    log_source = relationship("LogSource", back_populates="alerts")


class IPReputationCache(Base):
    __tablename__ = "ip_reputation_cache"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, index=True, nullable=False)
    abuse_confidence_score = Column(Integer, default=0)
    country_code = Column(String(5), nullable=True)
    is_malicious = Column(Boolean, default=False)
    last_checked = Column(DateTime, server_default=func.now())
