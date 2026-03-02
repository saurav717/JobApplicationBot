import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    String, Text, UniqueConstraint, create_engine
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.types import JSON

from app.config import DATABASE_URL


class Base(DeclarativeBase):
    pass


# Use JSONB for PostgreSQL, fall back to JSON for SQLite
def _json_col():
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        return JSONB
    return JSON


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    credentials = relationship("PlatformCredential", back_populates="user", cascade="all, delete-orphan")
    scrape_runs = relationship("ScrapeRun", back_populates="user", cascade="all, delete-orphan")
    application_queue = relationship("ApplicationQueue", back_populates="user", cascade="all, delete-orphan")


class PlatformCredential(Base):
    __tablename__ = "platform_credentials"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # 'linkedin', 'glassdoor', etc.
    encrypted_credentials = Column(Text, nullable=False)  # Fernet-encrypted JSON
    workday_url = Column(String(255), nullable=True)   # Only for Workday
    company_name = Column(String(255), nullable=True)  # Only for Workday
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "platform", "workday_url", name="uq_user_platform_workday"),
    )

    user = relationship("User", back_populates="credentials")


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)  # 'running', 'complete', 'error'
    platforms_used = Column(_json_col()(), nullable=True)   # ['linkedin', 'glassdoor']
    keywords_used = Column(_json_col()(), nullable=True)
    jobs_found = Column(Integer, default=0)
    jobs_stored = Column(Integer, default=0)
    errors = Column(_json_col()(), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="scrape_runs")


class ApplicationQueue(Base):
    __tablename__ = "application_queue"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(255), nullable=False)  # Qdrant job ID
    status = Column(String(50), default="queued")  # 'queued', 'applying', 'applied', 'failed'
    platform = Column(String(50), nullable=True)
    form_data = Column(_json_col()(), nullable=True)  # Auto-filled form values
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="application_queue")


# ── Database initialization ────────────────────────────────────────────────

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = DATABASE_URL or "sqlite:///./applybot.db"
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, connect_args=connect_args)
    return _engine


def init_db():
    """Create all tables if they don't exist."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
