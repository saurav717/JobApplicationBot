"""
Greenhouse ATS Scraper

Greenhouse is another popular ATS. Each company has:
  https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs

No authentication required for public job boards.
"""

import logging
from typing import Dict, List, Optional

import httpx

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)


class GreenhouseScraper(BaseScraper):
    """Scrapes a single company's Greenhouse job board."""

    platform_name = "greenhouse"
    requires_auth = False
    rate_limit_per_minute = 30

    def __init__(self, company_slug: str):
        super().__init__(credentials=None)
        self.company_slug = company_slug  # e.g. "airbnb", "dropbox"

    async def authenticate(self) -> bool:
        self.status = ScraperStatus.RUNNING
        return True

    async def search_jobs(
        self,
        keywords: List[str],
        location: Optional[str] = None,
        remote_only: bool = False,
        posted_within_days: int = 30,
        limit: int = 50,
    ) -> List[ScrapedJob]:
        """Fetch all jobs from a company's Greenhouse board."""
        jobs: List[ScrapedJob] = []
        url = f"https://boards-api.greenhouse.io/v1/boards/{self.company_slug}/jobs"
        params: Dict = {"content": "true"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 404:
                    logger.warning("[Greenhouse/%s] Company not found", self.company_slug)
                    return []
                resp.raise_for_status()
                data = resp.json()

            keyword_lower = [k.lower() for k in keywords]
            for job_data in data.get("jobs", []):
                job = self._parse_job(job_data)
                if job and (
                    not keywords
                    or any(k in job.title.lower() or k in job.description.lower() for k in keyword_lower)
                ):
                    jobs.append(job)
                    if len(jobs) >= limit:
                        break

            await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Greenhouse/%s] search_jobs error: %s", self.company_slug, exc)
            self.status = ScraperStatus.ERROR

        return jobs

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{self.company_slug}/jobs/{job_id}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return self._parse_job(resp.json())
        except Exception as exc:
            logger.exception("[Greenhouse/%s] get_job_details error: %s", self.company_slug, exc)
            return None

    def _parse_job(self, job_data: Dict) -> Optional[ScrapedJob]:
        try:
            title = job_data.get("title", "").strip()
            if not title:
                return None

            job_id = str(job_data.get("id", ""))
            apply_url = job_data.get("absolute_url", f"https://boards.greenhouse.io/{self.company_slug}/jobs/{job_id}")

            location = ""
            if job_data.get("location"):
                location = job_data["location"].get("name", "Not specified")
            elif job_data.get("offices"):
                location = ", ".join(o.get("name", "") for o in job_data["offices"])[:100]

            # Extract description from content
            content = job_data.get("content", "")
            if content:
                from bs4 import BeautifulSoup
                description = BeautifulSoup(content, "lxml").get_text(separator="\n")[:3000]
            else:
                description = ""

            updated_at = job_data.get("updated_at", "")

            return ScrapedJob(
                source_platform="greenhouse",
                source_id=job_id,
                source_url=apply_url,
                title=title,
                company=self.company_slug.title(),
                location=location or "Not specified",
                job_type="Full-time",
                description=description,
                application_url=apply_url,
                posted_date=updated_at,
                ats_type="greenhouse",
            )
        except Exception as exc:
            logger.debug("[Greenhouse/%s] Job parse error: %s", self.company_slug, exc)
            return None
