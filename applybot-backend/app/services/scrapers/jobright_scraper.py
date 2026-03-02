"""
Jobright.ai Scraper

Jobright aggregates job listings from multiple sources using AI matching.
Uses Playwright for authentication and job extraction.
"""

import asyncio
import logging
import random
from typing import Dict, List, Optional

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)


class JobrightScraper(BaseScraper):
    platform_name = "jobright"
    requires_auth = True
    rate_limit_per_minute = 20

    def __init__(self, credentials: Dict[str, str]):
        super().__init__(credentials)
        self._playwright = None
        self._browser = None
        self._page = None

    async def authenticate(self) -> bool:
        """Login to Jobright.ai via Playwright."""
        try:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            )
            context = await self._browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                )
            )
            self._page = await context.new_page()

            await self._page.goto("https://jobright.ai/login", wait_until="networkidle")
            await asyncio.sleep(random.uniform(1.0, 2.0))

            # Fill email and password — selector may need adjustment
            await self._page.fill('input[type="email"]', self.credentials.get("email", ""))
            await asyncio.sleep(random.uniform(0.3, 0.7))
            await self._page.fill('input[type="password"]', self.credentials.get("password", ""))
            await asyncio.sleep(random.uniform(0.3, 0.6))
            await self._page.click('button[type="submit"]')
            await self._page.wait_for_load_state("networkidle", timeout=15000)

            if "dashboard" in self._page.url or "jobs" in self._page.url:
                self.status = ScraperStatus.RUNNING
                logger.info("[Jobright] Authenticated successfully")
                return True

            logger.warning("[Jobright] Login redirect unexpected: %s", self._page.url)
            self.status = ScraperStatus.AUTH_FAILED
            return False

        except Exception as exc:
            logger.exception("[Jobright] Authentication error: %s", exc)
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
        """Navigate Jobright job search and extract listings."""
        if self._page is None:
            logger.error("[Jobright] Not authenticated")
            return []

        jobs: List[ScrapedJob] = []
        keyword_str = " ".join(keywords)

        try:
            search_url = f"https://jobright.ai/jobs?q={keyword_str.replace(' ', '+')}"
            if remote_only:
                search_url += "&remote=true"
            await self._page.goto(search_url, wait_until="networkidle", timeout=20000)
            await asyncio.sleep(random.uniform(1.5, 2.5))

            # Scroll to load more
            for _ in range(min(limit // 10, 5)):
                await self._page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(random.uniform(1.0, 2.0))

            # Generic job card selector — may need adjustment based on Jobright's actual DOM
            cards = await self._page.query_selector_all('[data-testid="job-card"], .job-card, article.job')
            logger.info("[Jobright] Found %d job cards", len(cards))

            for card in cards[:limit]:
                job = await self._parse_card(card)
                if job:
                    jobs.append(job)

            await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[Jobright] search_jobs error: %s", exc)
            self.status = ScraperStatus.ERROR

        return jobs

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        return None

    async def close(self) -> None:
        try:
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass

    async def _parse_card(self, card) -> Optional[ScrapedJob]:
        try:
            title_el = await card.query_selector("h2, h3, .job-title, [data-testid='job-title']")
            company_el = await card.query_selector(".company-name, [data-testid='company-name']")
            location_el = await card.query_selector(".location, [data-testid='location']")
            link_el = await card.query_selector("a")

            title = (await title_el.inner_text()).strip() if title_el else ""
            company = (await company_el.inner_text()).strip() if company_el else ""
            location = (await location_el.inner_text()).strip() if location_el else "Not specified"
            href = await link_el.get_attribute("href") if link_el else ""

            if not title or not company:
                return None

            job_id = href.split("/")[-1].split("?")[0] if href else title

            return ScrapedJob(
                source_platform="jobright",
                source_id=job_id,
                source_url=f"https://jobright.ai{href}" if href and href.startswith("/") else (href or ""),
                title=title,
                company=company,
                location=location,
                job_type="Full-time",
                description="",
                application_url=f"https://jobright.ai{href}" if href and href.startswith("/") else (href or ""),
            )
        except Exception as exc:
            logger.debug("[Jobright] Card parse error: %s", exc)
            return None
