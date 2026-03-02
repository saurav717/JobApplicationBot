"""
Scraper Orchestrator

Coordinates all scrapers, manages parallel execution, handles failures,
and deduplicates results. Acts as the single entry point for multi-platform
job scraping.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from .base_scraper import BaseScraper, ScrapedJob
from .glassdoor_scraper import GlassdoorScraper
from .greenhouse_scraper import GreenhouseScraper
from .indeed_scraper import IndeedScraper
from .jobright_scraper import JobrightScraper
from .lever_scraper import LeverScraper
from .linkedin_scraper import LinkedInScraper
from .workday_scraper import WorkdayScraper

logger = logging.getLogger(__name__)

# Platform factory mapping
_SCRAPER_CLASSES = {
    "linkedin": LinkedInScraper,
    "glassdoor": GlassdoorScraper,
    "indeed": IndeedScraper,
    "jobright": JobrightScraper,
}


class ScraperOrchestrator:
    """Coordinates all scrapers and aggregates deduplicated results."""

    def __init__(self, credential_manager=None):
        self.credential_manager = credential_manager
        self.scrapers: Dict[str, BaseScraper] = {}
        self._scrape_status: Dict[str, str] = {}  # platform -> "ok" | "error" | "auth_failed"

    # ── Initialization ─────────────────────────────────────────────────────

    async def initialize_scrapers(self, user_id: str) -> Dict[str, bool]:
        """
        Initialize all scrapers with the user's stored credentials.
        Returns {platform: initialized_successfully}.
        """
        results: Dict[str, bool] = {}

        if self.credential_manager is None:
            logger.warning("[Orchestrator] No credential manager — scrapers requiring auth will be skipped")

        # Standard platforms
        for platform, scraper_cls in _SCRAPER_CLASSES.items():
            creds = None
            if self.credential_manager:
                creds = self.credential_manager.get_credential(user_id, platform)

            if creds is None and scraper_cls.requires_auth:
                logger.info("[Orchestrator] Skipping %s — no credentials stored", platform)
                results[platform] = False
                continue

            try:
                scraper = scraper_cls(creds) if creds else scraper_cls()
                auth_ok = await scraper.authenticate()
                if auth_ok:
                    self.scrapers[platform] = scraper
                    results[platform] = True
                    logger.info("[Orchestrator] %s initialized", platform)
                else:
                    results[platform] = False
                    if self.credential_manager:
                        self.credential_manager.mark_invalid(user_id, platform)
            except Exception as exc:
                logger.exception("[Orchestrator] Error initializing %s: %s", platform, exc)
                results[platform] = False

        # Workday (multiple instances per user)
        if self.credential_manager:
            workday_creds_list = self.credential_manager.get_credentials_by_platform(user_id, "workday")
            for cred in workday_creds_list:
                company = cred.get("company_name", "unknown")
                workday_url = cred.get("workday_url", "")
                if not workday_url:
                    continue
                key = f"workday_{company}"
                try:
                    scraper = WorkdayScraper(
                        credentials=cred,
                        workday_url=workday_url,
                        company_name=company,
                    )
                    if await scraper.authenticate():
                        self.scrapers[key] = scraper
                        results[key] = True
                        logger.info("[Orchestrator] Workday/%s initialized", company)
                    else:
                        results[key] = False
                except Exception as exc:
                    logger.exception("[Orchestrator] Error initializing Workday/%s: %s", company, exc)
                    results[key] = False

        return results

    def add_lever_scraper(self, company_slug: str) -> None:
        """Register a Lever ATS scraper for a specific company."""
        key = f"lever_{company_slug}"
        self.scrapers[key] = LeverScraper(company_slug)

    def add_greenhouse_scraper(self, company_slug: str) -> None:
        """Register a Greenhouse ATS scraper for a specific company."""
        key = f"greenhouse_{company_slug}"
        self.scrapers[key] = GreenhouseScraper(company_slug)

    # ── Search ─────────────────────────────────────────────────────────────

    async def search_all_platforms(
        self,
        keywords: List[str],
        location: Optional[str] = None,
        remote_only: bool = False,
        posted_within_days: int = 30,
        limit_per_platform: int = 50,
    ) -> List[ScrapedJob]:
        """
        Search all initialized scrapers in parallel.
        Returns deduplicated results sorted by completeness score.
        """
        if not self.scrapers:
            logger.warning("[Orchestrator] No scrapers initialized")
            return []

        tasks: List[Tuple[str, asyncio.Task]] = []
        for platform, scraper in self.scrapers.items():
            task = asyncio.create_task(
                scraper.search_jobs(
                    keywords=keywords,
                    location=location,
                    remote_only=remote_only,
                    posted_within_days=posted_within_days,
                    limit=limit_per_platform,
                )
            )
            tasks.append((platform, task))

        all_jobs: List[ScrapedJob] = []
        for platform, task in tasks:
            try:
                jobs = await asyncio.wait_for(task, timeout=120)
                logger.info("[Orchestrator] %s: %d jobs", platform, len(jobs))
                all_jobs.extend(jobs)
                self._scrape_status[platform] = "ok"
            except asyncio.TimeoutError:
                logger.warning("[Orchestrator] %s timed out", platform)
                self._scrape_status[platform] = "timeout"
            except Exception as exc:
                logger.exception("[Orchestrator] %s error: %s", platform, exc)
                self._scrape_status[platform] = "error"

        unique = self._deduplicate_jobs(all_jobs)
        logger.info("[Orchestrator] %d total -> %d unique after dedup", len(all_jobs), len(unique))
        return unique

    def get_scrape_status(self) -> Dict[str, str]:
        """Return last per-platform scrape status."""
        return dict(self._scrape_status)

    # ── Cleanup ────────────────────────────────────────────────────────────

    async def close_all(self) -> None:
        """Clean up all scraper resources."""
        for scraper in self.scrapers.values():
            try:
                await scraper.close()
            except Exception:
                pass
        self.scrapers.clear()

    # ── Deduplication ──────────────────────────────────────────────────────

    def _deduplicate_jobs(self, jobs: List[ScrapedJob]) -> List[ScrapedJob]:
        """
        Remove duplicate jobs based on (normalized title, normalized company).
        When duplicates exist, keep the most complete record.
        """
        seen: Dict[Tuple[str, str], ScrapedJob] = {}
        for job in jobs:
            key = (
                job.title.lower().strip(),
                job.company.lower().strip(),
            )
            if key not in seen:
                seen[key] = job
            else:
                if self._completeness_score(job) > self._completeness_score(seen[key]):
                    seen[key] = job
        return list(seen.values())

    @staticmethod
    def _completeness_score(job: ScrapedJob) -> int:
        score = 0
        if job.description and len(job.description) > 100:
            score += 3
        if job.salary_min or job.salary_max:
            score += 2
        if job.skills_required:
            score += len(job.skills_required)
        if job.company_rating:
            score += 1
        if job.posted_date:
            score += 1
        if job.easy_apply:
            score += 1
        return score
