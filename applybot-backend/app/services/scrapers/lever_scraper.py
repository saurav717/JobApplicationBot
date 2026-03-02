"""
Lever ATS Scraper

Lever is a popular ATS used by many startups and mid-size companies.
Lever provides a public JSON API at:
  https://{company}.lever.co/v0/postings?mode=json&skip=0&limit=25

No authentication required for public job postings.
"""

import logging
from typing import Dict, List, Optional

import httpx

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)


class LeverScraper(BaseScraper):
    """Scrapes a single company's Lever job board."""

    platform_name = "lever"
    requires_auth = False
    rate_limit_per_minute = 30

    def __init__(self, company_slug: str):
        super().__init__(credentials=None)
        self.company_slug = company_slug  # e.g. "stripe", "airbnb"

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
        """Fetch all job postings from a company's Lever board."""
        jobs: List[ScrapedJob] = []
        base_url = f"https://api.lever.co/v0/postings/{self.company_slug}"
        params = {"mode": "json", "skip": 0, "limit": min(limit, 25)}
        if location:
            params["location"] = location

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                while len(jobs) < limit:
                    resp = await client.get(base_url, params=params)
                    if resp.status_code == 404:
                        logger.warning("[Lever/%s] Company not found", self.company_slug)
                        break
                    resp.raise_for_status()
                    data = resp.json()

                    if not data:
                        break

                    keyword_lower = [k.lower() for k in keywords]
                    for posting in data:
                        job = self._parse_posting(posting)
                        if job and (
                            not keywords
                            or any(k in job.title.lower() or k in job.description.lower() for k in keyword_lower)
                        ):
                            jobs.append(job)

                    if len(data) < params["limit"]:
                        break
                    params["skip"] += params["limit"]
                    await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Lever/%s] search_jobs error: %s", self.company_slug, exc)
            self.status = ScraperStatus.ERROR

        return jobs[:limit]

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        url = f"https://api.lever.co/v0/postings/{self.company_slug}/{job_id}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return self._parse_posting(resp.json())
        except Exception as exc:
            logger.exception("[Lever/%s] get_job_details error: %s", self.company_slug, exc)
            return None

    def _parse_posting(self, posting: Dict) -> Optional[ScrapedJob]:
        try:
            title = posting.get("text", "").strip()
            if not title:
                return None

            job_id = posting.get("id", "")
            apply_url = posting.get("applyUrl", f"https://jobs.lever.co/{self.company_slug}/{job_id}")
            hosted_url = posting.get("hostedUrl", apply_url)

            categories = posting.get("categories", {})
            location = categories.get("location", "Not specified")
            commitment = categories.get("commitment", "Full-time")

            description_parts = []
            for section in posting.get("descriptionBody", {}).get("descriptionList", []):
                description_parts.append(section.get("content", ""))
            description = "\n".join(description_parts)[:3000]

            return ScrapedJob(
                source_platform="lever",
                source_id=job_id,
                source_url=hosted_url,
                title=title,
                company=self.company_slug.title(),
                location=location,
                job_type=commitment,
                description=description,
                application_url=apply_url,
                posted_date=str(posting.get("createdAt", "")),
                ats_type="lever",
            )
        except Exception as exc:
            logger.debug("[Lever/%s] Posting parse error: %s", self.company_slug, exc)
            return None
