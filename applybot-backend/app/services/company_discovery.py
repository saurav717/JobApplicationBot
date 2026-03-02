"""
Company Discovery Service

Uses SerpAPI (or Google Custom Search) to find companies and their job portals.
Identifies which ATS each company uses based on career-page URL patterns.
Falls back to free heuristics when no API key is configured.
"""

import logging
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# ── ATS URL patterns ────────────────────────────────────────────────────────

ATS_PATTERNS: Dict[str, List[str]] = {
    "workday": [
        r"\.myworkdayjobs\.com",
        r"\.wd\d+\.myworkdayjobs\.com",
    ],
    "lever": [
        r"jobs\.lever\.co",
        r"\.lever\.co/\w+",
    ],
    "greenhouse": [
        r"boards\.greenhouse\.io",
        r"\.greenhouse\.io/\w+",
    ],
    "ashby": [
        r"\.ashbyhq\.com",
        r"jobs\.ashbyhq\.com",
    ],
    "linkedin": [
        r"linkedin\.com/jobs",
        r"linkedin\.com/company/.+/jobs",
    ],
    "taleo": [
        r"\.taleo\.net",
    ],
    "icims": [
        r"\.icims\.com",
        r"careers-\w+\.icims\.com",
    ],
    "smartrecruiters": [
        r"\.smartrecruiters\.com",
    ],
    "bamboohr": [
        r"\.bamboohr\.com/jobs",
    ],
    "jobvite": [
        r"jobs\.jobvite\.com",
        r"\.jobvite\.com/jobs",
    ],
}


def identify_ats(url: str) -> Optional[str]:
    """Return the ATS name detected in *url*, or None."""
    for ats_name, patterns in ATS_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return ats_name
    return None


def extract_company_name_from_url(url: str) -> Optional[str]:
    """Try to extract a company name from a known ATS URL structure."""
    patterns = [
        (r"([a-zA-Z0-9-]+)\.myworkdayjobs\.com", 1),    # Workday
        (r"jobs\.lever\.co/([a-zA-Z0-9-]+)", 1),          # Lever
        (r"boards\.greenhouse\.io/([a-zA-Z0-9-]+)", 1),   # Greenhouse
        (r"([a-zA-Z0-9-]+)\.ashbyhq\.com", 1),            # Ashby
        (r"([a-zA-Z0-9-]+)\.bamboohr\.com", 1),           # BambooHR
    ]
    for pattern, group in patterns:
        m = re.search(pattern, url, re.IGNORECASE)
        if m:
            return m.group(group).replace("-", " ").title()
    return None


def extract_company_name_from_title(title: str) -> Optional[str]:
    """Try to extract a company name from common search-result title patterns."""
    title_patterns = [
        r"careers?\s+(?:at|@)\s+([^|\-–]+)",
        r"([^|\-–]+?)\s+careers?",
        r"jobs?\s+(?:at|@)\s+([^|\-–]+)",
        r"([^|\-–]+?)\s+jobs?",
        r"([^|\-–]+?)\s+(?:is\s+)?hiring",
    ]
    for pattern in title_patterns:
        m = re.search(pattern, title, re.IGNORECASE)
        if m:
            company = m.group(1).strip()
            if 2 < len(company) < 60:
                return company
    return None


class CompanyDiscoveryService:
    """Discover companies hiring for specific roles via Google/SerpAPI search."""

    def __init__(self, serpapi_key: Optional[str] = None):
        self.serpapi_key = serpapi_key

    # ── Public API ──────────────────────────────────────────────────────────

    async def discover_companies(
        self,
        industries: List[str],
        roles: List[str],
        location: str = "United States",
        limit: int = 50,
    ) -> List[Dict]:
        """
        Search for companies hiring for *roles* in *industries*.

        Returns a list of dicts:
            {company_name, careers_url, ats_type, discovered_from}
        """
        queries: List[str] = []
        for industry in industries[:5]:          # cap to avoid rate limits
            for role in roles[:5]:
                queries.append(f"{industry} companies hiring {role} careers")
                queries.append(f"top {industry} {role} jobs site:greenhouse.io OR site:lever.co OR site:myworkdayjobs.com")

        discovered: List[Dict] = []
        seen_names: set = set()

        for query in queries[:12]:               # cap total queries
            if len(discovered) >= limit:
                break
            try:
                results = await self._google_search(query, location)
            except Exception as exc:
                logger.warning("[CompanyDiscovery] Search failed for '%s': %s", query, exc)
                continue

            for result in results:
                company = self._extract_company_info(result)
                if not company:
                    continue
                name_lower = company["company_name"].lower()
                if name_lower in seen_names:
                    continue
                seen_names.add(name_lower)
                discovered.append(company)
                if len(discovered) >= limit:
                    break

        return discovered

    async def get_company_jobs_url(self, company_name: str) -> Optional[Dict]:
        """
        Find a specific company's career portal.
        Returns {careers_url, ats_type} or None.
        """
        queries = [
            f"{company_name} careers jobs portal",
            f"{company_name} site:greenhouse.io OR site:lever.co OR site:myworkdayjobs.com",
        ]
        for query in queries:
            try:
                results = await self._google_search(query, "United States")
            except Exception as exc:
                logger.warning("[CompanyDiscovery] get_company_jobs_url search failed: %s", exc)
                continue

            for result in results[:5]:
                url = result.get("link", "")
                title = result.get("title", "")
                ats_type = identify_ats(url)

                company_in_url = company_name.lower().replace(" ", "") in url.lower().replace("-", "")
                company_in_title = company_name.lower() in title.lower()

                if (company_in_url or company_in_title) and (
                    ats_type or "career" in url.lower() or "jobs" in url.lower()
                ):
                    return {"careers_url": url, "ats_type": ats_type}
        return None

    # ── Internal search helpers ─────────────────────────────────────────────

    async def _google_search(self, query: str, location: str) -> List[Dict]:
        if self.serpapi_key:
            return await self._serpapi_search(query, location)
        # Without an API key we cannot do Google search — return empty.
        logger.debug("[CompanyDiscovery] No SERPAPI_KEY; skipping search for '%s'", query)
        return []

    async def _serpapi_search(self, query: str, location: str) -> List[Dict]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "location": location,
                    "api_key": self.serpapi_key,
                    "num": 20,
                    "engine": "google",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("organic_results", [])

    # ── Extraction helpers ──────────────────────────────────────────────────

    def _extract_company_info(self, search_result: Dict) -> Optional[Dict]:
        url = search_result.get("link", "")
        title = search_result.get("title", "")

        ats_type = identify_ats(url)

        company_name = (
            extract_company_name_from_url(url)
            or extract_company_name_from_title(title)
        )
        if not company_name:
            return None

        return {
            "company_name": company_name,
            "careers_url": url,
            "ats_type": ats_type,
            "discovered_from": title,
        }
