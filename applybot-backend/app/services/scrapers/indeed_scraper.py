"""
Indeed Job Scraper

Indeed is less aggressive with bot detection than LinkedIn/Glassdoor.
Uses httpx + BeautifulSoup for efficient HTML scraping.

URL structure:
  https://www.indeed.com/jobs?q={keywords}&l={location}&fromage={days}

Authentication is optional — more results available without rate limits when logged in.
"""

import logging
from typing import Dict, List, Optional
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


class IndeedScraper(BaseScraper):
    platform_name = "indeed"
    requires_auth = False  # Can scrape without auth
    rate_limit_per_minute = 30

    def __init__(self, credentials: Optional[Dict[str, str]] = None):
        super().__init__(credentials)
        self._session_cookies: Dict[str, str] = {}

    async def authenticate(self) -> bool:
        """Indeed can be scraped without auth. Returns True immediately."""
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
        """Scrape Indeed using HTML parsing."""
        keyword_str = quote_plus(" ".join(keywords))
        jobs: List[ScrapedJob] = []

        params = {
            "q": " ".join(keywords),
            "fromage": str(min(posted_within_days, 30)),
            "limit": "50",
            "sort": "date",
        }
        if location:
            params["l"] = location
        if remote_only:
            params["remotejob"] = "1"

        try:
            async with httpx.AsyncClient(
                headers=_HEADERS,
                cookies=self._session_cookies,
                timeout=15.0,
                follow_redirects=True,
            ) as client:
                resp = await client.get("https://www.indeed.com/jobs", params=params)
                resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "lxml")

            # Indeed job cards
            cards = soup.find_all("div", attrs={"data-jk": True})
            logger.info("[Indeed] Found %d job cards", len(cards))

            for card in cards[:limit]:
                job = self._parse_card(card)
                if job:
                    jobs.append(job)

            await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Indeed] search_jobs error: %s", exc)
            self.status = ScraperStatus.ERROR

        return jobs

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        """Fetch full job description from Indeed job page."""
        url = f"https://www.indeed.com/viewjob?jk={job_id}"
        try:
            async with httpx.AsyncClient(headers=_HEADERS, timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(url)
                resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            desc_el = soup.find("div", id="jobDescriptionText")
            description = desc_el.get_text(separator="\n").strip() if desc_el else ""
            await self.respect_rate_limit()
            return ScrapedJob(
                source_platform="indeed",
                source_id=job_id,
                source_url=url,
                title="",
                company="",
                location="",
                job_type="Full-time",
                description=description,
                application_url=url,
            )
        except Exception as exc:
            logger.exception("[Indeed] get_job_details error: %s", exc)
            return None

    # ── Helpers ────────────────────────────────────────────────────────────

    def _parse_card(self, card) -> Optional[ScrapedJob]:
        try:
            job_id = card.get("data-jk", "")
            if not job_id:
                return None

            title_el = card.find("h2", class_=lambda c: c and "jobTitle" in c)
            company_el = card.find("span", attrs={"data-testid": "company-name"})
            location_el = card.find("div", attrs={"data-testid": "text-location"})
            salary_el = card.find("div", attrs={"data-testid": "attribute_snippet_testid"})

            title = title_el.get_text(strip=True) if title_el else ""
            company = company_el.get_text(strip=True) if company_el else ""
            location = location_el.get_text(strip=True) if location_el else "Not specified"
            salary_text = salary_el.get_text(strip=True) if salary_el else ""

            if not title:
                return None

            description_el = card.find("div", class_=lambda c: c and "job-snippet" in (c or ""))
            description = description_el.get_text(separator=" ", strip=True) if description_el else ""

            return ScrapedJob(
                source_platform="indeed",
                source_id=job_id,
                source_url=f"https://www.indeed.com/viewjob?jk={job_id}",
                title=title,
                company=company,
                location=location,
                job_type="Remote" if "remote" in location.lower() else "Full-time",
                description=description,
                application_url=f"https://www.indeed.com/viewjob?jk={job_id}",
                salary_min=self._parse_salary_min(salary_text),
                salary_max=self._parse_salary_max(salary_text),
            )
        except Exception as exc:
            logger.debug("[Indeed] Card parse error: %s", exc)
            return None

    @staticmethod
    def _parse_salary_min(text: str) -> Optional[int]:
        try:
            import re
            numbers = re.findall(r"\$?([\d,]+)", text)
            if numbers:
                return int(numbers[0].replace(",", ""))
        except Exception:
            pass
        return None

    @staticmethod
    def _parse_salary_max(text: str) -> Optional[int]:
        try:
            import re
            numbers = re.findall(r"\$?([\d,]+)", text)
            if len(numbers) >= 2:
                return int(numbers[1].replace(",", ""))
        except Exception:
            pass
        return None
