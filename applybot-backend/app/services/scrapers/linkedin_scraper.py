"""
LinkedIn Job Scraper

Uses Playwright with stealth mode to avoid bot detection.
Implements conservative rate limiting (10 req/min) and human-like delays.

Key considerations:
- LinkedIn aggressively detects and blocks scrapers
- Uses stealth mode to mask automation signals
- Implements human-like delays (1-3s between actions)
- Stores session cookies to reduce login frequency
- Gracefully handles 2FA and CAPTCHA by reporting AUTH_FAILED
"""

import asyncio
import logging
import random
from typing import Dict, List, Optional

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus

logger = logging.getLogger(__name__)

# LinkedIn time filter values (seconds)
_TIME_FILTERS = {
    1: "r86400",
    7: "r604800",
    30: "r2592000",
}


class LinkedInScraper(BaseScraper):
    platform_name = "linkedin"
    requires_auth = True
    rate_limit_per_minute = 10  # Very conservative to avoid detection

    def __init__(self, credentials: Dict[str, str]):
        super().__init__(credentials)
        self._playwright = None
        self._browser = None
        self._page = None

    async def authenticate(self) -> bool:
        """
        Login to LinkedIn using Playwright + stealth mode.

        Steps:
        1. Launch browser with stealth settings
        2. Navigate to linkedin.com/login
        3. Enter email + password with human-like delays
        4. Handle 2FA / CAPTCHA (report AUTH_FAILED so user is notified)
        5. Verify success by checking URL contains /feed or /jobs
        """
        try:
            from playwright.async_api import async_playwright
            try:
                from playwright_stealth import stealth_async
                _has_stealth = True
            except ImportError:
                _has_stealth = False
                logger.warning("playwright-stealth not installed; scraper may be detected")

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                ],
            )

            context = await self._browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1920, "height": 1080},
            )

            self._page = await context.new_page()

            if _has_stealth:
                await stealth_async(self._page)

            await self._page.goto("https://www.linkedin.com/login", wait_until="networkidle")
            await asyncio.sleep(random.uniform(1.0, 2.0))

            await self._page.fill("#username", self.credentials.get("email", ""))
            await asyncio.sleep(random.uniform(0.4, 0.9))
            await self._page.fill("#password", self.credentials.get("password", ""))
            await asyncio.sleep(random.uniform(0.4, 0.8))

            await self._page.click('button[type="submit"]')
            await self._page.wait_for_load_state("networkidle", timeout=15000)

            current_url = self._page.url
            if "/feed" in current_url or "/jobs" in current_url or "/mynetwork" in current_url:
                self.status = ScraperStatus.RUNNING
                logger.info("[LinkedIn] Authenticated successfully")
                return True

            # CAPTCHA / 2FA / security challenge
            if any(x in current_url for x in ("challenge", "checkpoint", "2fa")):
                logger.warning("[LinkedIn] Auth challenge detected (2FA/CAPTCHA) at: %s", current_url)
                self.status = ScraperStatus.AUTH_FAILED
                return False

            logger.warning("[LinkedIn] Unexpected redirect after login: %s", current_url)
            self.status = ScraperStatus.AUTH_FAILED
            return False

        except Exception as exc:
            logger.exception("[LinkedIn] Authentication error: %s", exc)
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
        """
        Search LinkedIn Jobs.

        URL structure:
          /jobs/search/?keywords=...&location=...&f_TPR=r{seconds}&f_WT=2
        Filters:
          f_TPR  : time posted  (r86400=24h, r604800=week, r2592000=month)
          f_WT   : work type    (1=onsite, 2=remote, 3=hybrid)
        """
        if self._page is None:
            logger.error("[LinkedIn] Not authenticated — call authenticate() first")
            return []

        jobs: List[ScrapedJob] = []

        keyword_str = "%20".join(keywords)
        time_filter = self._get_time_filter(posted_within_days)
        search_url = f"https://www.linkedin.com/jobs/search/?keywords={keyword_str}"
        if location:
            search_url += f"&location={location.replace(' ', '%20')}"
        if remote_only:
            search_url += "&f_WT=2"
        search_url += f"&f_TPR={time_filter}"

        try:
            await self._page.goto(search_url, wait_until="networkidle", timeout=20000)
            await asyncio.sleep(random.uniform(1.5, 2.5))

            # Scroll to trigger lazy loading
            scroll_rounds = min(limit // 25 + 1, 4)
            for _ in range(scroll_rounds):
                await self._page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(random.uniform(1.5, 3.0))

            job_cards = await self._page.query_selector_all(".job-card-container")
            logger.info("[LinkedIn] Found %d job cards", len(job_cards))

            for card in job_cards[:limit]:
                try:
                    job = await self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as exc:
                    logger.debug("[LinkedIn] Error parsing card: %s", exc)

            await self.respect_rate_limit()

        except Exception as exc:
            logger.exception("[LinkedIn] search_jobs error: %s", exc)
            self.status = ScraperStatus.ERROR

        return jobs

    async def get_job_details(self, job_id: str) -> Optional[ScrapedJob]:
        """Fetch full job description from individual job page."""
        if self._page is None:
            return None
        try:
            url = f"https://www.linkedin.com/jobs/view/{job_id}"
            await self._page.goto(url, wait_until="networkidle", timeout=15000)
            await asyncio.sleep(random.uniform(1.0, 2.0))

            title_el = await self._page.query_selector(".job-details-jobs-unified-top-card__job-title")
            company_el = await self._page.query_selector(".job-details-jobs-unified-top-card__company-name")
            desc_el = await self._page.query_selector(".jobs-description__content")

            title = (await title_el.inner_text()).strip() if title_el else ""
            company = (await company_el.inner_text()).strip() if company_el else ""
            description = (await desc_el.inner_text()).strip() if desc_el else ""

            await self.respect_rate_limit()

            return ScrapedJob(
                source_platform="linkedin",
                source_id=job_id,
                source_url=url,
                title=title,
                company=company,
                location="",
                job_type="Full-time",
                description=description,
                application_url=url,
            )
        except Exception as exc:
            logger.exception("[LinkedIn] get_job_details error: %s", exc)
            return None

    async def close(self) -> None:
        """Clean up browser resources."""
        try:
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass
        finally:
            self._browser = None
            self._playwright = None
            self._page = None

    # ── Private helpers ────────────────────────────────────────────────────

    async def _parse_job_card(self, card) -> Optional[ScrapedJob]:
        title_el = await card.query_selector(".job-card-list__title")
        company_el = await card.query_selector(".job-card-container__company-name")
        location_el = await card.query_selector(".job-card-container__metadata-item")

        title = (await title_el.inner_text()).strip() if title_el else None
        company = (await company_el.inner_text()).strip() if company_el else None
        location = (await location_el.inner_text()).strip() if location_el else "Not specified"

        if not title or not company:
            return None

        link_el = await card.query_selector("a")
        href = await link_el.get_attribute("href") if link_el else None
        job_id = None
        if href and "/view/" in href:
            job_id = href.split("/view/")[1].split("/")[0].split("?")[0]

        if not job_id:
            return None

        # Check for Easy Apply badge
        easy_apply_el = await card.query_selector(".job-card-container__apply-method")
        easy_apply_text = (await easy_apply_el.inner_text()).strip() if easy_apply_el else ""
        easy_apply = "easy apply" in easy_apply_text.lower()

        return ScrapedJob(
            source_platform="linkedin",
            source_id=job_id,
            source_url=f"https://www.linkedin.com/jobs/view/{job_id}",
            title=title,
            company=company,
            location=location,
            job_type="Full-time",
            description="",  # Populated via get_job_details if needed
            application_url=f"https://www.linkedin.com/jobs/view/{job_id}",
            easy_apply=easy_apply,
        )

    def _get_time_filter(self, days: int) -> str:
        for threshold, value in sorted(_TIME_FILTERS.items()):
            if days <= threshold:
                return value
        return _TIME_FILTERS[30]
