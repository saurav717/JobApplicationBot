"""
Authentication & credential management router.

Provides:
  - User registration / login (JWT)
  - Platform credential CRUD with encryption
  - Connection-test endpoint per platform
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, sessionmaker

from app.config import JWT_ALGORITHM, JWT_EXPIRATION_HOURS, JWT_SECRET
from app.models.database import User, get_engine, init_db
from app.services.credential_manager import CredentialManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
credential_manager = CredentialManager()


# ── Pydantic schemas ───────────────────────────────────────────────────────

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PlatformCredential(BaseModel):
    platform: str          # "linkedin" | "glassdoor" | "indeed" | "jobright" | "workday"
    email: EmailStr
    password: str
    workday_url: Optional[str] = None    # Only for Workday
    company_name: Optional[str] = None  # Only for Workday


class CredentialTestResult(BaseModel):
    platform: str
    success: bool
    message: str


# ── DB helpers ─────────────────────────────────────────────────────────────

def _get_session() -> Session:
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


# ── JWT helpers ────────────────────────────────────────────────────────────

def _create_access_token(user_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expires}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Dependency: decode JWT and return basic user info."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    return {"user_id": user_id}


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserRegistration):
    """Register a new ApplyBot user."""
    init_db()
    session = _get_session()
    try:
        existing = session.query(User).filter_by(email=user.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        new_user = User(
            email=user.email,
            password_hash=pwd_context.hash(user.password),
            name=user.name,
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        token = _create_access_token(new_user.id)
        return TokenResponse(
            access_token=token,
            user=UserOut(id=new_user.id, email=new_user.email, name=new_user.name),
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.exception("Registration failed")
        raise HTTPException(status_code=500, detail="Registration failed")
    finally:
        session.close()


@router.post("/login", response_model=TokenResponse)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with email + password, returns JWT."""
    session = _get_session()
    try:
        user = session.query(User).filter_by(email=form_data.username).first()
        if not user or not pwd_context.verify(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = _create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            user=UserOut(id=user.id, email=user.email, name=user.name),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Login failed")
    finally:
        session.close()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Return basic profile for the authenticated user."""
    session = _get_session()
    try:
        user = session.query(User).filter_by(id=current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserOut(id=user.id, email=user.email, name=user.name)
    finally:
        session.close()


@router.post("/credentials/store", status_code=status.HTTP_204_NO_CONTENT)
async def store_platform_credentials(
    credential: PlatformCredential,
    current_user: Dict = Depends(get_current_user),
):
    """Store encrypted credentials for a job platform."""
    user_id = current_user["user_id"]
    creds = {"email": credential.email, "password": credential.password}
    success = credential_manager.store_credential(
        user_id=user_id,
        platform=credential.platform,
        credentials=creds,
        workday_url=credential.workday_url,
        company_name=credential.company_name,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to store credentials")


@router.post("/credentials/test", response_model=CredentialTestResult)
async def test_platform_credentials(
    credential: PlatformCredential,
    current_user: Dict = Depends(get_current_user),
):
    """Test if credentials work for a platform (basic connectivity check)."""
    result = await _test_connection(
        platform=credential.platform,
        email=credential.email,
        password=credential.password,
        workday_url=credential.workday_url,
    )
    return result


@router.get("/credentials/status")
async def get_credential_status(current_user: Dict = Depends(get_current_user)):
    """Get which platforms have stored credentials."""
    return credential_manager.get_credential_status(current_user["user_id"])


@router.delete("/credentials/{platform}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credentials(
    platform: str,
    workday_url: Optional[str] = None,
    current_user: Dict = Depends(get_current_user),
):
    """Delete stored credentials for a platform."""
    credential_manager.delete_credential(
        user_id=current_user["user_id"],
        platform=platform,
        workday_url=workday_url,
    )


# ── Connection test helper ─────────────────────────────────────────────────

SUPPORTED_PLATFORMS = {"linkedin", "glassdoor", "indeed", "jobright", "workday"}


async def _test_connection(
    platform: str,
    email: str,
    password: str,
    workday_url: Optional[str] = None,
) -> CredentialTestResult:
    """
    Lightweight connectivity test: verify the platform login page is reachable
    and credentials are structurally valid.  Full browser-based auth is deferred
    to the scraper layer to avoid blocking the request.
    """
    if platform not in SUPPORTED_PLATFORMS:
        return CredentialTestResult(
            platform=platform,
            success=False,
            message=f"Unsupported platform: {platform}",
        )

    if not email or not password:
        return CredentialTestResult(
            platform=platform,
            success=False,
            message="Email and password are required",
        )

    if platform == "workday" and not workday_url:
        return CredentialTestResult(
            platform=platform,
            success=False,
            message="workday_url is required for Workday",
        )

    # Verify the platform URL is reachable
    import httpx
    url_map = {
        "linkedin": "https://www.linkedin.com/login",
        "glassdoor": "https://www.glassdoor.com/index.htm",
        "indeed": "https://www.indeed.com",
        "jobright": "https://jobright.ai",
        "workday": f"https://{workday_url}" if workday_url else None,
    }
    check_url = url_map.get(platform)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(check_url)
        if resp.status_code < 500:
            return CredentialTestResult(
                platform=platform,
                success=True,
                message=f"{platform.title()} is reachable. Credentials will be validated on first scrape.",
            )
        return CredentialTestResult(
            platform=platform,
            success=False,
            message=f"{platform.title()} returned HTTP {resp.status_code}",
        )
    except Exception as exc:
        return CredentialTestResult(
            platform=platform,
            success=False,
            message=f"Could not reach {platform}: {exc}",
        )
