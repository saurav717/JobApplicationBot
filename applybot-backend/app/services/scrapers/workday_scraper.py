"""
Workday ATS Scraper

Workday is used by many large companies, each with their own tenant instance.
Examples:
  - amazon.wd5.myworkdayjobs.com
  - capitalone.wd1.myworkdayjobs.com
  - microsoft.wd5.myworkdayjobs.com

Uses Workday's public REST API (available even without login for many tenants).
"""

import logging
import re
from typing import Dict, List, Optional

import httpx

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)


class WorkdayScraper(BaseScraper):
    platform_name = "workday"
    requires_auth = True
    rate_limit_per_minute = 15

    def __init__(
        self,
        credentials: Dict[str, str],
        workday_url: str,
        company_name: str,
    ):
        super().__init__(credentials)
        self.workday_url = workday_url  # e.g. "amazon.wd5.myworkdayjobs.com"
        self.company_name = company_name
        self.tenant = self._extract_tenant(workday_url)
        self._auth_headers: Dict[str, str] = {}

    async def authenticate(self) -> bool:
        """
        Authenticate with Workday. Many tenants allow unauthenticated browsing.
        If credentials are provided, attempt token-based auth.
        """
        # Try unauthenticated first — most public career sites allow it
        try:
            test_url = self._jobs_api_url()
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    test_url,
                    json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""},
                )
            if resp.status_code < 400:
                self.status = ScraperStatus.RUNNING
                logger.info("[Workday/%s] Public API accessible", self.company_name)
                return True
        except Exception as exc:
            logger.debug("[Workday/%s] Public API check failed: %s", self.company_name, exc)

        self.status = ScraperStatus.AUTH_FAILED
        return False

    async def search_jobs(
        self,
        keywords: List[str],
        location: Optional[str] = None,
        remote_only: bool = False,
        posted_within_days: int = 30,
        limit: int = 50,
    ) -> List[ScrapedJob]:
        """
        Query Workday's jobs REST API.

        POST /wday/cxs/{tenant}/External_Career_Site/jobs
        Body: { "appliedFacets": {}, "limit": 20, "offset": 0, "searchText": "..." }
        """
        keyword_str = " ".join(keywords)
        jobs: List[ScrapedJob] = []
        offset = 0
        page_size = min(20, limit)

        try:
            async with httpx.AsyncClient(
                headers=self._auth_headers,
                timeout=20.0,
                follow_redirects=True,
            ) as client:
                while len(jobs) < limit:
                    payload = {
                        "appliedFacets": {},
                        "limit": page_size,
                        "offset": offset,
                        "searchText": keyword_str,
                    }
                    if remote_only:
                        payload["appliedFacets"]["Remote_Type"] = ["Remote"]

                    resp = await client.post(self._jobs_api_url(), json=payload)
                    if resp.status_code == 404:
                        logger.warning("[Workday/%s] API endpoint not found", self.company_name)
                        break
                    resp.raise_for_status()
                    data = resp.json()

                    postings = data.get("jobPostings", [])
                    if not postings:
                        break

                    for posting in postings:
                        job = self._parse_posting(posting)
                        if job:
                            jobs.append(job)

                    if len(postings) < page_size:
                        break  # No more pages
                    offset += page_size
                    await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Workday/%s] search_jobs error: %s", self.company_name, exc)
            self.status = ScraperStatus.ERROR

        return jobs[:limit]

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        """Fetch full job details from Workday."""
        url = f"https://{self.workday_url}/wday/cxs/{self.tenant}/External_Career_Site/job/{job_id}"
        try:
            async with httpx.AsyncClient(headers=self._auth_headers, timeout=15.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            job_data = data.get("jobPostingInfo", data)
            title = job_data.get("title", "")
            description = job_data.get("jobDescription", {}).get("content", "")
            await self.respect_rate_limit()

            return ScrapedJob(
                source_platform="workday",
                source_id=job_id,
                source_url=f"https://{self.workday_url}/en-US/job/{job_id}",
                title=title,
                company=self.company_name,
                location="",
                job_type="Full-time",
                description=description[:3000],
                application_url=f"https://{self.workday_url}/en-US/job/{job_id}",
                ats_type="workday",
            )
        except Exception as exc:
            logger.exception("[Workday/%s] get_job_details error: %s", self.company_name, exc)
            return None

    # ── Helpers ────────────────────────────────────────────────────────────

    def _jobs_api_url(self) -> str:
        return f"https://{self.workday_url}/wday/cxs/{self.tenant}/External_Career_Site/jobs"

    @staticmethod
    def _extract_tenant(url: str) -> str:
        """Extract tenant ID: 'amazon.wd5.myworkdayjobs.com' -> 'amazon'."""
        return url.split(".")[0]

    def _parse_posting(self, posting: Dict) -> Optional[ScrapedJob]:
        try:
            title = posting.get("title", "").strip()
            if not title:
                return None

            job_id = posting.get("externalPath", "").lstrip("/").split("/")[-1]
            location_info = posting.get("locationsText", "") or posting.get("location", "")
            posted_on = posting.get("postedOn", "")
            bullet_fields = posting.get("bulletFields", [])
            description = " | ".join(bullet_fields) if bullet_fields else ""

            return ScrapedJob(
                source_platform="workday",
                source_id=job_id or title,
                source_url=f"https://{self.workday_url}/en-US/job/{job_id}",
                title=title,
                company=self.company_name,
                location=location_info or "Not specified",
                job_type="Full-time",
                description=description,
                application_url=f"https://{self.workday_url}/en-US/job/{job_id}",
                posted_date=posted_on,
                ats_type="workday",
            )
        except Exception as exc:
            logger.debug("[Workday/%s] Posting parse error: %s", self.company_name, exc)
            return None
