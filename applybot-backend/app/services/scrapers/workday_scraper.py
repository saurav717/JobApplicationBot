"""
Workday ATS Scraper

Workday is used by many large companies, each with their own tenant instance.
Examples:
  - amazon.wd5.myworkdayjobs.com
  - capitalone.wd1.myworkdayjobs.com
  - microsoft.wd5.myworkdayjobs.com

Uses Workday's public REST API (available even without login for many tenants).
Also includes WorkdayDiscovery for auto-scraping well-known Workday tenants.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional

import httpx

from .base_scraper import BaseScraper, ScrapedJob, ScraperStatus, generate_job_id

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

            raw_job_id = posting.get("externalPath", "").lstrip("/").split("/")[-1]
            source_url = f"https://{self.workday_url}/en-US/job/{raw_job_id}"
            location_info = posting.get("locationsText", "") or posting.get("location", "")
            posted_on = posting.get("postedOn", "")
            bullet_fields = posting.get("bulletFields", [])
            description = " | ".join(bullet_fields) if bullet_fields else ""

            # Use deterministic unique ID to prevent duplicates within same company
            unique_id = generate_job_id("workday", self.company_name, title, source_url)

            return ScrapedJob(
                source_platform="workday",
                source_id=unique_id,
                source_url=source_url,
                title=title,
                company=self.company_name,
                location=location_info or "Not specified",
                job_type="Full-time",
                description=description,
                application_url=source_url,
                posted_date=posted_on,
                ats_type="workday",
            )
        except Exception as exc:
            logger.debug("[Workday/%s] Posting parse error: %s", self.company_name, exc)
            return None


class WorkdayDiscovery:
    """
    Discover and scrape jobs from well-known companies that use Workday.

    Workday's public career-site API requires no authentication for most
    tenants, so this class can scrape hundreds of top companies without
    needing user credentials.
    """

    # fmt: off
    KNOWN_TENANTS: List[Dict[str, str]] = [
        {"company": "Amazon",       "url": "amazon.wd5.myworkdayjobs.com"},
        {"company": "Capital One",  "url": "capitalone.wd1.myworkdayjobs.com"},
        {"company": "Microsoft",    "url": "microsoft.wd5.myworkdayjobs.com"},
        {"company": "Google",       "url": "google.wd5.myworkdayjobs.com"},
        {"company": "Meta",         "url": "meta.wd5.myworkdayjobs.com"},
        {"company": "Apple",        "url": "apple.wd5.myworkdayjobs.com"},
        {"company": "Netflix",      "url": "netflix.wd5.myworkdayjobs.com"},
        {"company": "Stripe",       "url": "stripe.wd5.myworkdayjobs.com"},
        {"company": "Airbnb",       "url": "airbnb.wd5.myworkdayjobs.com"},
        {"company": "Uber",         "url": "uber.wd5.myworkdayjobs.com"},
        {"company": "Lyft",         "url": "lyft.wd5.myworkdayjobs.com"},
        {"company": "Salesforce",   "url": "salesforce.wd5.myworkdayjobs.com"},
        {"company": "Adobe",        "url": "adobe.wd5.myworkdayjobs.com"},
        {"company": "Intuit",       "url": "intuit.wd5.myworkdayjobs.com"},
        {"company": "PayPal",       "url": "paypal.wd5.myworkdayjobs.com"},
        {"company": "Block",        "url": "block.wd5.myworkdayjobs.com"},
        {"company": "Coinbase",     "url": "coinbase.wd5.myworkdayjobs.com"},
        {"company": "Robinhood",    "url": "robinhood.wd5.myworkdayjobs.com"},
        {"company": "Plaid",        "url": "plaid.wd5.myworkdayjobs.com"},
        {"company": "Datadog",      "url": "datadoghq.wd5.myworkdayjobs.com"},
        {"company": "Snowflake",    "url": "snowflake.wd5.myworkdayjobs.com"},
        {"company": "Databricks",   "url": "databricks.wd5.myworkdayjobs.com"},
        {"company": "Palantir",     "url": "palantir.wd5.myworkdayjobs.com"},
        {"company": "Twilio",       "url": "twilio.wd5.myworkdayjobs.com"},
        {"company": "Okta",         "url": "okta.wd5.myworkdayjobs.com"},
        {"company": "Cloudflare",   "url": "cloudflare.wd5.myworkdayjobs.com"},
        {"company": "HashiCorp",    "url": "hashicorp.wd5.myworkdayjobs.com"},
        {"company": "MongoDB",      "url": "mongodb.wd5.myworkdayjobs.com"},
        {"company": "Elastic",      "url": "elastic.wd5.myworkdayjobs.com"},
        {"company": "Confluent",    "url": "confluent.wd5.myworkdayjobs.com"},
        {"company": "Splunk",       "url": "splunk.wd5.myworkdayjobs.com"},
        {"company": "Palo Alto Networks", "url": "paloaltonetworks.wd5.myworkdayjobs.com"},
        {"company": "CrowdStrike",  "url": "crowdstrike.wd5.myworkdayjobs.com"},
        {"company": "Workday",      "url": "workday.wd5.myworkdayjobs.com"},
        {"company": "ServiceNow",   "url": "servicenow.wd5.myworkdayjobs.com"},
        {"company": "Zendesk",      "url": "zendesk.wd5.myworkdayjobs.com"},
        {"company": "HubSpot",      "url": "hubspot.wd5.myworkdayjobs.com"},
        {"company": "DocuSign",     "url": "docusign.wd5.myworkdayjobs.com"},
        {"company": "Box",          "url": "box.wd5.myworkdayjobs.com"},
        {"company": "Dropbox",      "url": "dropbox.wd5.myworkdayjobs.com"},
        {"company": "Zoom",         "url": "zoom.wd5.myworkdayjobs.com"},
        {"company": "Slack",        "url": "salesforce.wd5.myworkdayjobs.com"},  # Slack is under Salesforce
        {"company": "Twitter/X",    "url": "twitter.wd5.myworkdayjobs.com"},
        {"company": "LinkedIn",     "url": "microsoft.wd5.myworkdayjobs.com"},   # LinkedIn is under Microsoft
        {"company": "Intel",        "url": "intel.wd5.myworkdayjobs.com"},
        {"company": "AMD",          "url": "amd.wd5.myworkdayjobs.com"},
        {"company": "NVIDIA",       "url": "nvidia.wd5.myworkdayjobs.com"},
        {"company": "Qualcomm",     "url": "qualcomm.wd5.myworkdayjobs.com"},
        {"company": "Cisco",        "url": "cisco.wd5.myworkdayjobs.com"},
        {"company": "Oracle",       "url": "oracle.wd5.myworkdayjobs.com"},
        {"company": "IBM",          "url": "ibm.wd5.myworkdayjobs.com"},
        {"company": "SAP",          "url": "sap.wd5.myworkdayjobs.com"},
        {"company": "VMware",       "url": "vmware.wd5.myworkdayjobs.com"},
        {"company": "Dell",         "url": "dell.wd5.myworkdayjobs.com"},
        {"company": "HP",           "url": "hp.wd5.myworkdayjobs.com"},
        {"company": "JPMorgan Chase","url": "jpmc.wd5.myworkdayjobs.com"},
        {"company": "Goldman Sachs","url": "goldmansachs.wd5.myworkdayjobs.com"},
        {"company": "Morgan Stanley","url": "morganstanley.wd5.myworkdayjobs.com"},
        {"company": "American Express","url": "aexp.wd5.myworkdayjobs.com"},
        {"company": "Visa",         "url": "visa.wd5.myworkdayjobs.com"},
        {"company": "Mastercard",   "url": "mastercard.wd5.myworkdayjobs.com"},
    ]
    # fmt: on

    @classmethod
    async def scrape_all_known_companies(
        cls,
        keywords: List[str],
        limit_per_company: int = 20,
        max_companies: int = 20,
        concurrency: int = 5,
    ) -> List[ScrapedJob]:
        """
        Scrape jobs matching *keywords* from the known Workday tenant list.

        Uses a semaphore to limit concurrent requests and avoid hammering servers.
        Returns deduplicated list of ScrapedJob objects.
        """
        sem = asyncio.Semaphore(concurrency)
        tenants = cls.KNOWN_TENANTS[:max_companies]

        async def scrape_one(tenant: Dict[str, str]) -> List[ScrapedJob]:
            async with sem:
                try:
                    scraper = WorkdayScraper(
                        credentials={},
                        workday_url=tenant["url"],
                        company_name=tenant["company"],
                    )
                    if not await asyncio.wait_for(scraper.authenticate(), timeout=15):
                        return []
                    return await asyncio.wait_for(
                        scraper.search_jobs(keywords=keywords, limit=limit_per_company),
                        timeout=60,
                    )
                except Exception as exc:
                    logger.warning(
                        "[WorkdayDiscovery] Failed to scrape %s: %s",
                        tenant["company"],
                        exc,
                    )
                    return []

        results = await asyncio.gather(*[scrape_one(t) for t in tenants])
        all_jobs: List[ScrapedJob] = []
        seen: set = set()
        for job_list in results:
            for job in job_list:
                key = (job.title.lower().strip(), job.company.lower().strip())
                if key not in seen:
                    seen.add(key)
                    all_jobs.append(job)
        logger.info("[WorkdayDiscovery] Collected %d unique jobs from %d tenants", len(all_jobs), len(tenants))
        return all_jobs
