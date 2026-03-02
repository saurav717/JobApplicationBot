"""
Credential Manager Service

Encrypts platform credentials at rest using Fernet symmetric encryption,
stores them in the database, and never exposes raw credentials in logs.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from app.config import CREDENTIAL_ENCRYPTION_KEY
from app.models.database import PlatformCredential, get_engine

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    if not CREDENTIAL_ENCRYPTION_KEY:
        raise RuntimeError(
            "CREDENTIAL_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    key = CREDENTIAL_ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def _get_session() -> Session:
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class CredentialManager:
    """Manage platform credentials with encryption at rest."""

    def store_credential(
        self,
        user_id: str,
        platform: str,
        credentials: Dict[str, str],
        workday_url: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> bool:
        """Encrypt and store credentials for a platform.

        Returns True on success. Raw credentials are never logged.
        """
        fernet = _get_fernet()
        # Serialize and encrypt — never log the raw payload
        encrypted = fernet.encrypt(json.dumps(credentials).encode()).decode()

        session = _get_session()
        try:
            existing = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, workday_url=workday_url)
                .first()
            )
            if existing:
                existing.encrypted_credentials = encrypted
                existing.company_name = company_name
                existing.is_valid = True
                existing.updated_at = datetime.now(timezone.utc)
            else:
                record = PlatformCredential(
                    user_id=user_id,
                    platform=platform,
                    encrypted_credentials=encrypted,
                    workday_url=workday_url,
                    company_name=company_name,
                )
                session.add(record)
            session.commit()
            return True
        except Exception:
            logger.exception("Failed to store credential for platform=%s user=%s", platform, user_id)
            session.rollback()
            return False
        finally:
            session.close()

    def get_credential(
        self,
        user_id: str,
        platform: str,
        workday_url: Optional[str] = None,
    ) -> Optional[Dict[str, str]]:
        """Retrieve and decrypt credentials for a platform."""
        session = _get_session()
        try:
            record = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, workday_url=workday_url, is_valid=True)
                .first()
            )
            if not record:
                return None
            return self._decrypt(record.encrypted_credentials)
        except Exception:
            logger.exception("Failed to get credential for platform=%s user=%s", platform, user_id)
            return None
        finally:
            session.close()

    def get_credentials_by_platform(
        self, user_id: str, platform: str
    ) -> List[Dict[str, Any]]:
        """Return all credential records for a platform (e.g. multiple Workday instances)."""
        session = _get_session()
        try:
            records = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, is_valid=True)
                .all()
            )
            results = []
            for r in records:
                creds = self._decrypt(r.encrypted_credentials)
                if creds is not None:
                    creds["workday_url"] = r.workday_url
                    creds["company_name"] = r.company_name
                    results.append(creds)
            return results
        except Exception:
            logger.exception("Failed to list credentials for platform=%s user=%s", platform, user_id)
            return []
        finally:
            session.close()

    def delete_credential(
        self,
        user_id: str,
        platform: str,
        workday_url: Optional[str] = None,
    ) -> bool:
        """Remove stored credentials for a platform."""
        session = _get_session()
        try:
            deleted = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, workday_url=workday_url)
                .delete()
            )
            session.commit()
            return deleted > 0
        except Exception:
            logger.exception("Failed to delete credential for platform=%s user=%s", platform, user_id)
            session.rollback()
            return False
        finally:
            session.close()

    def get_credential_status(self, user_id: str) -> Dict[str, Any]:
        """Return which platforms have stored credentials (no raw data exposed)."""
        session = _get_session()
        try:
            records = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, is_valid=True)
                .all()
            )
            status: Dict[str, Any] = {}
            for r in records:
                if r.platform == "workday":
                    if "workday" not in status:
                        status["workday"] = []
                    status["workday"].append({
                        "company_name": r.company_name,
                        "workday_url": r.workday_url,
                        "last_verified_at": r.last_verified_at.isoformat() if r.last_verified_at else None,
                    })
                else:
                    status[r.platform] = {
                        "connected": True,
                        "last_verified_at": r.last_verified_at.isoformat() if r.last_verified_at else None,
                    }
            return status
        except Exception:
            logger.exception("Failed to get credential status for user=%s", user_id)
            return {}
        finally:
            session.close()

    def mark_verified(
        self,
        user_id: str,
        platform: str,
        workday_url: Optional[str] = None,
    ) -> None:
        """Update last_verified_at timestamp after a successful connection test."""
        session = _get_session()
        try:
            record = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, workday_url=workday_url)
                .first()
            )
            if record:
                record.last_verified_at = datetime.now(timezone.utc)
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def mark_invalid(
        self,
        user_id: str,
        platform: str,
        workday_url: Optional[str] = None,
    ) -> None:
        """Mark credentials as invalid (e.g. login failed)."""
        session = _get_session()
        try:
            record = (
                session.query(PlatformCredential)
                .filter_by(user_id=user_id, platform=platform, workday_url=workday_url)
                .first()
            )
            if record:
                record.is_valid = False
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    # ── Private helpers ────────────────────────────────────────────────────

    def _decrypt(self, encrypted: str) -> Optional[Dict[str, str]]:
        try:
            fernet = _get_fernet()
            raw = fernet.decrypt(encrypted.encode())
            return json.loads(raw)
        except (InvalidToken, Exception):
            logger.error("Decryption failed — credential may be corrupted or key rotated")
            return None
