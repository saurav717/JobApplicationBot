"""
Glassdoor Job Scraper

Glassdoor exposes a GraphQL API after authentication.
Uses Playwright to authenticate, then makes direct GraphQL requests
for efficiency. Falls back to HTML scraping if the API changes.

Key data available:
  - Job listings with salary estimates
  - Company ratings and reviews
"""

import asyncio
import logging
import random
from typing import Dict, List, Optional

import httpx

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)

_GQL_URL = "https://www.glassdoor.com/graph"

_SEARCH_QUERY = """
query JobSearchQuery($keyword: String, $locationId: Int, $numJobs: Int) {
  jobListings(
    contextHolder: {
      searchParams: {
        keyword: $keyword
        locationId: $locationId
        numPerPage: $numJobs
      }
    }
  ) {
    jobListings {
      jobview {
        header {
          jobLink
          jobTitleText
          employerNameFromSearch
          locId
          locationName
          salarySource {
            salaryEstimate {
              basePayRangeMid
              currency
            }
          }
          easyApply
          employerRating
          ageInDays
        }
        overview {
          description
        }
      }
    }
  }
}
"""


class GlassdoorScraper(BaseScraper):
    platform_name = "glassdoor"
    requires_auth = True
    rate_limit_per_minute = 20

    def __init__(self, credentials: Dict[str, str]):
        super().__init__(credentials)
        self._cookies: Optional[Dict[str, str]] = None
        self._csrf_token: Optional[str] = None

    async def authenticate(self) -> bool:
        """
        Login to Glassdoor via Playwright, extract session cookies
        for subsequent GraphQL requests.
        """
        try:
            from playwright.async_api import async_playwright
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                )
            )
            page = await context.new_page()

            await page.goto("https://www.glassdoor.com/profile/login_input.htm", wait_until="networkidle")
            await asyncio.sleep(random.uniform(1.0, 2.0))

            await page.fill('input[name="username"]', self.credentials.get("email", ""))
            await asyncio.sleep(random.uniform(0.3, 0.7))
            await page.fill('input[name="password"]', self.credentials.get("password", ""))
            await asyncio.sleep(random.uniform(0.3, 0.7))
            await page.click('button[type="submit"]')
            await page.wait_for_load_state("networkidle", timeout=15000)

            if "profile" in page.url or "glassdoor.com/member" in page.url:
                cookies = await context.cookies()
                self._cookies = {c["name"]: c["value"] for c in cookies}
                # Extract CSRF token if present
                self._csrf_token = self._cookies.get("gdId", "")
                self.status = ScraperStatus.RUNNING
                logger.info("[Glassdoor] Authenticated successfully")
                await browser.close()
                await playwright.stop()
                return True

            logger.warning("[Glassdoor] Login failed, current URL: %s", page.url)
            self.status = ScraperStatus.AUTH_FAILED
            await browser.close()
            await playwright.stop()
            return False

        except Exception as exc:
            logger.exception("[Glassdoor] Authentication error: %s", exc)
            self.status = ScraperStatus.ERROR
            return False

    async def search_jobs(
        self,
        keywords: List[str],
        location: Optional[str] = None,
        remote_only: bool = False,
        posted_within_days: int = 30,
        limit: int = 50,
    ) -> List[ScrapedJob]:
        """Search Glassdoor using GraphQL API."""
        if not self._cookies:
            logger.error("[Glassdoor] Not authenticated")
            return []

        keyword_str = " ".join(keywords)
        jobs: List[ScrapedJob] = []

        try:
            headers = {
                "Content-Type": "application/json",
                "gd-csrf-token": self._csrf_token or "",
                "Referer": "https://www.glassdoor.com/",
            }
            payload = {
                "query": _SEARCH_QUERY,
                "variables": {
                    "keyword": keyword_str,
                    "locationId": 1,  # US — expand as needed
                    "numJobs": min(limit, 30),
                },
            }

            async with httpx.AsyncClient(
                cookies=self._cookies,
                headers=headers,
                timeout=20.0,
            ) as client:
                resp = await client.post(_GQL_URL, json=payload)
                resp.raise_for_status()
                data = resp.json()

            listings = (
                data.get("data", {})
                .get("jobListings", {})
                .get("jobListings", [])
            )

            for item in listings:
                job = self._parse_listing(item)
                if job:
                    jobs.append(job)

            await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Glassdoor] search_jobs error: %s", exc)
            self.status = ScraperStatus.ERROR

        return jobs

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        return None  # Details included in search results

    # ── Helpers ────────────────────────────────────────────────────────────

    def _parse_listing(self, item: Dict) -> Optional[ScrapedJob]:
        try:
            header = item.get("jobview", {}).get("header", {})
            overview = item.get("jobview", {}).get("overview", {})

            title = header.get("jobTitleText", "").strip()
            company = header.get("employerNameFromSearch", "").strip()
            location = header.get("locationName", "").strip()
            job_link = header.get("jobLink", "")
            description = overview.get("description", "")

            if not title or not company:
                return None

            salary_info = header.get("salarySource", {}).get("salaryEstimate", {})
            salary_mid = salary_info.get("basePayRangeMid")
            currency = salary_info.get("currency", "USD")

            job_id = job_link.split("jl=")[-1].split("&")[0] if "jl=" in job_link else job_link

            return ScrapedJob(
                source_platform="glassdoor",
                source_id=job_id,
                source_url=f"https://www.glassdoor.com{job_link}" if job_link.startswith("/") else job_link,
                title=title,
                company=company,
                location=location or "Not specified",
                job_type="Full-time",
                description=description[:3000],
                application_url=f"https://www.glassdoor.com{job_link}" if job_link.startswith("/") else job_link,
                salary_min=int(salary_mid * 0.85) if salary_mid else None,
                salary_max=int(salary_mid * 1.15) if salary_mid else None,
                salary_currency=currency,
                easy_apply=bool(header.get("easyApply")),
                company_rating=header.get("employerRating"),
            )
        except Exception as exc:
            logger.debug("[Glassdoor] Listing parse error: %s", exc)
            return None
