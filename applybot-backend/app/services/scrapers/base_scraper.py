"""
Abstract base class for all job scrapers.
"""

import asyncio
import hashlib
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ScraperStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    RATE_LIMITED = "rate_limited"
    AUTH_FAILED = "auth_failed"
    ERROR = "error"


@dataclass
class ScrapedJob:
    """Standardized job format across all platforms."""
    source_platform: str
    source_id: str           # Platform-specific job ID
    source_url: str
    title: str
    company: str
    location: str
    job_type: str            # "Full-time" | "Part-time" | "Contract" | "Remote"
    description: str
    application_url: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    requirements: List[str] = field(default_factory=list)
    skills_required: List[str] = field(default_factory=list)
    posted_date: str = ""
    application_deadline: Optional[str] = None
    easy_apply: bool = False    # Can apply without leaving platform
    company_logo_url: Optional[str] = None
    company_rating: Optional[float] = None   # Glassdoor rating
    ats_type: Optional[str] = None           # "workday" | "lever" | "greenhouse" etc.


def generate_job_id(platform: str, company: str, title: str, url: str = "") -> str:
    """
    Generate a unique, deterministic job ID based on content.
    Hashes (platform + company + title + url) to ensure no two distinct
    job postings share the same ID even within the same company.
    """
    unique_string = f"{platform}:{company.lower().strip()}:{title.lower().strip()}:{url}"
    hash_id = hashlib.sha256(unique_string.encode()).hexdigest()[:16]
    safe_platform = platform.replace(" ", "_")[:20]
    return f"{safe_platform}_{hash_id}"


class BaseScraper(ABC):
    """Abstract base class for all job scrapers."""

    def __init__(self, credentials: Optional[Dict[str, str]] = None):
        self.credentials = credentials
        self.status = ScraperStatus.IDLE
        self.session = None
        self.rate_limit_remaining: int = 100
        self._last_request_time: Optional[float] = None

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Return platform identifier (e.g. 'linkedin')."""
        ...

    @property
    @abstractmethod
    def requires_auth(self) -> bool:
        """Whether this scraper requires authentication."""
        ...

    @property
    @abstractmethod
    def rate_limit_per_minute(self) -> int:
        """Max requests per minute to avoid bans."""
        ...

    @abstractmethod
    async def authenticate(self) -> bool:
        """Login to the platform. Return True if successful."""
        ...

    @abstractmethod
    async def search_jobs(
        self,
        keywords: List[str],
        location: Optional[str] = None,
        remote_only: bool = False,
        posted_within_days: int = 30,
        limit: int = 50,
    ) -> List[ScrapedJob]:
        """Search for jobs matching criteria."""
        ...

    @abstractmethod
    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        """Get full details for a specific job."""
        ...

    async def respect_rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        min_interval = 60.0 / max(self.rate_limit_per_minute, 1)
        now = time.monotonic()
        if self._last_request_time is not None:
            elapsed = now - self._last_request_time
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
        self._last_request_time = time.monotonic()

    async def close(self) -> None:
        """Clean up resources."""
        if self.session:
            await self.session.close()
            self.session = None
