import asyncio
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

from app.models.schemas import JobCreate
from app.services.vector_store import store_jobs_batch, get_all_jobs
from app.services.embeddings import embed_text

# ── Track scraper state ────────────────────────────────────────────────────
_last_run: str = "Never"
_jobs_scraped: int = 0


def get_status() -> Dict[str, Any]:
    return {"last_run": _last_run, "jobs_scraped": _jobs_scraped}


# ── Public job API fetchers ────────────────────────────────────────────────

async def fetch_arbeitnow() -> List[Dict[str, Any]]:
    """Fetch jobs from Arbeitnow (free, no API key needed)."""
    url = "https://www.arbeitnow.com/api/job-board-api"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        jobs = []
        for item in data.get("data", [])[:50]:
            jobs.append({
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("location", "Remote"),
                "type": "Full-time" if not item.get("remote") else "Remote",
                "description": item.get("description", "")[:2000],
                "skills_required": _extract_skills_from_text(item.get("description", "")),
                "apply_url": item.get("url", ""),
                "logo_url": f"https://logo.clearbit.com/{_domain_from_company(item.get('company_name',''))}",
                "posted": item.get("created_at", ""),
                "source_platform": "arbeitnow",
            })
        return jobs
    except Exception as e:
        print(f"[Arbeitnow] Error: {e}")
        return []


async def fetch_remotive(search: str = "") -> List[Dict[str, Any]]:
    """Fetch remote jobs from Remotive (free, no API key needed).
    Optionally filter by keyword search query.
    """
    categories = ["software-dev", "data", "devops-sysadmin"]

    async def fetch_category(client: httpx.AsyncClient, cat: str) -> List[Dict[str, Any]]:
        try:
            params = {"category": cat, "limit": 20}
            if search:
                params["search"] = search
            r = await client.get("https://remotive.com/api/remote-jobs", params=params)
            r.raise_for_status()
            data = r.json()
            return [
                {
                    "title": item.get("title", ""),
                    "company": item.get("company_name", ""),
                    "location": item.get("candidate_required_location", "Remote"),
                    "type": "Remote",
                    "salary": item.get("salary", ""),
                    "description": item.get("description", "")[:2000],
                    "skills_required": item.get("tags", [])[:10],
                    "apply_url": item.get("url", ""),
                    "logo_url": item.get("company_logo", ""),
                    "posted": item.get("publication_date", ""),
                    "source_platform": "remotive",
                }
                for item in data.get("jobs", [])
            ]
        except Exception as e:
            print(f"[Remotive/{cat}] Error: {e}")
            return []

    async with httpx.AsyncClient(timeout=15.0) as client:
        results = await asyncio.gather(*[fetch_category(client, cat) for cat in categories])

    all_jobs = []
    for r in results:
        all_jobs.extend(r)
    return all_jobs


async def fetch_the_muse() -> List[Dict[str, Any]]:
    """Fetch jobs from The Muse public API (Currently returning 403, returning empty for now)."""
    return []


async def fetch_remoteok() -> List[Dict[str, Any]]:
    """Fetch jobs from RemoteOK (free, no API key needed)."""
    url = "https://remoteok.com/api"
    try:
        async with httpx.AsyncClient(
            timeout=15.0,
            headers={"User-Agent": "Mozilla/5.0 ApplyBot/1.0"},
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        jobs = []
        # First element is a metadata object, skip it
        for item in data[1:51] if len(data) > 1 else []:
            if not isinstance(item, dict):
                continue
            title = item.get("position", "")
            company = item.get("company", "")
            if not title or not company:
                continue
            tags = item.get("tags", []) or []
            description = item.get("description", "") or ""
            jobs.append({
                "title": title,
                "company": company,
                "location": "Remote",
                "type": "Remote",
                "description": description[:2000],
                "skills_required": [t for t in tags[:10] if isinstance(t, str)],
                "apply_url": item.get("url", ""),
                "logo_url": item.get("company_logo", ""),
                "posted": item.get("date", ""),
                "source_platform": "remoteok",
            })
        return jobs
    except Exception as e:
        print(f"[RemoteOK] Error: {e}")
        return []


async def fetch_jobicy() -> List[Dict[str, Any]]:
    """Fetch remote jobs from Jobicy (free, no API key needed)."""
    url = "https://jobicy.com/api/v2/remote-jobs"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params={"count": 50, "geo": "anywhere", "industry": "engineering"})
            r.raise_for_status()
            data = r.json()
        jobs = []
        for item in data.get("jobs", []):
            title = item.get("jobTitle", "")
            company = item.get("companyName", "")
            if not title or not company:
                continue
            description = item.get("jobDescription", "") or ""
            jobs.append({
                "title": title,
                "company": company,
                "location": item.get("jobGeo", "Remote"),
                "type": item.get("jobType", "Remote"),
                "description": description[:2000],
                "skills_required": _extract_skills_from_text(description),
                "apply_url": item.get("url", ""),
                "logo_url": item.get("companyLogo", ""),
                "posted": item.get("pubDate", ""),
                "source_platform": "jobicy",
            })
        return jobs
    except Exception as e:
        print(f"[Jobicy] Error: {e}")
        return []


async def fetch_himalayas() -> List[Dict[str, Any]]:
    """Fetch remote jobs from Himalayas.app (free, no API key needed)."""
    url = "https://himalayas.app/jobs/api"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params={"limit": 50})
            r.raise_for_status()
            data = r.json()
        jobs = []
        for item in data.get("jobs", []):
            title = item.get("title", "")
            company = item.get("companyName", "") or item.get("company", {}).get("name", "")
            if not title or not company:
                continue
            description = item.get("description", "") or ""
            jobs.append({
                "title": title,
                "company": company,
                "location": item.get("locationRestrictions", ["Remote"])[0] if item.get("locationRestrictions") else "Remote",
                "type": item.get("jobType", "Remote"),
                "description": description[:2000],
                "skills_required": _extract_skills_from_text(description),
                "apply_url": item.get("applicationLink", ""),
                "logo_url": item.get("companyLogo", ""),
                "posted": item.get("createdAt", ""),
                "source_platform": "himalayas",
            })
        return jobs
    except Exception as e:
        print(f"[Himalayas] Error: {e}")
        return []


async def fetch_findwork(search: str = "") -> List[Dict[str, Any]]:
    """Fetch developer jobs from Findwork.dev (free, no API key needed)."""
    url = "https://findwork.dev/api/jobs/"
    try:
        params: Dict[str, Any] = {"limit": 50, "order_by": "-date"}
        if search:
            params["search"] = search
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
        jobs = []
        for item in data.get("results", []):
            title = item.get("role", "")
            company = item.get("company_name", "")
            if not title or not company:
                continue
            keywords = item.get("keywords", []) or []
            jobs.append({
                "title": title,
                "company": company,
                "location": item.get("location", "Remote"),
                "type": "Remote" if item.get("remote") else "Full-time",
                "description": item.get("text", "")[:2000],
                "skills_required": [k for k in keywords[:10] if isinstance(k, str)],
                "apply_url": item.get("url", ""),
                "logo_url": item.get("logo", ""),
                "posted": item.get("date_posted", ""),
                "source_platform": "findwork",
            })
        return jobs
    except Exception as e:
        print(f"[Findwork] Error: {e}")
        return []


# ── Deduplication ──────────────────────────────────────────────────────────

def _deduplicate(new_jobs: List[Dict], existing_jobs: List[Dict]) -> List[Dict]:
    """Remove jobs that already exist (match by title+company)."""
    existing_keys = {
        (j.get("title", "").lower().strip(), j.get("company", "").lower().strip())
        for j in existing_jobs
    }
    unique = []
    seen = set()
    for job in new_jobs:
        key = (job.get("title", "").lower().strip(), job.get("company", "").lower().strip())
        if key not in existing_keys and key not in seen:
            unique.append(job)
            seen.add(key)
    return unique


# ── Main scrape orchestrators ──────────────────────────────────────────────

async def run_resume_targeted_scrape(search_profile: Dict[str, Any]) -> int:
    """
    Targeted job scrape driven by a resume's job search profile.
    Uses the profile's keywords and target titles to fetch more relevant jobs.
    Returns count of new jobs stored.
    """
    global _last_run, _jobs_scraped
    keywords = " ".join(search_profile.get("search_keywords", [])[:5])
    print(f"[Scraper] Targeted scrape for: '{keywords}'")

    results = await asyncio.gather(
        fetch_arbeitnow(),
        fetch_remotive(search=keywords),
        fetch_remoteok(),
        fetch_jobicy(),
        fetch_himalayas(),
        fetch_findwork(search=keywords),
        return_exceptions=True,
    )

    all_new = []
    for r in results:
        if isinstance(r, list):
            all_new.extend(r)

    if not all_new:
        print("[Scraper] No targeted jobs fetched.")
        return 0

    # Filter fetched jobs to those relevant to target titles/keywords
    target_titles = [t.lower() for t in search_profile.get("target_titles", [])]
    kw_lower = [k.lower() for k in search_profile.get("search_keywords", [])]

    def _is_relevant(job: Dict) -> bool:
        if not target_titles and not kw_lower:
            return True
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        title_match = any(t in text for t in target_titles)
        kw_match = sum(1 for k in kw_lower if k in text) >= 2
        return title_match or kw_match

    relevant = [j for j in all_new if _is_relevant(j)]
    print(f"[Scraper] {len(all_new)} fetched, {len(relevant)} relevant after filtering")

    if not relevant:
        return 0

    existing = get_all_jobs(limit=5000)
    unique_jobs = _deduplicate(relevant, existing)
    print(f"[Scraper] {len(unique_jobs)} new after dedup")

    if not unique_jobs:
        return 0

    batch_size = 10
    total_stored = 0
    for i in range(0, len(unique_jobs), batch_size):
        batch = unique_jobs[i:i + batch_size]
        texts = [
            (f"{job.get('title','')} {job.get('company','')} {job.get('description','')[:300]} {' '.join(job.get('skills_required',[]))}".strip() or "job listing")
            for job in batch
        ]
        embed_results = await asyncio.gather(*[embed_text(t) for t in texts], return_exceptions=True)
        valid_batch, vectors = [], []
        for job, vec in zip(batch, embed_results):
            if isinstance(vec, Exception):
                print(f"[Scraper] Embedding failed: {vec}")
                continue
            if vec and isinstance(vec, list) and len(vec) > 0:
                valid_batch.append(job)
                vectors.append(vec)
        if valid_batch:
            total_stored += store_jobs_batch(valid_batch, vectors)

    _last_run = datetime.now(timezone.utc).isoformat()
    _jobs_scraped = total_stored
    print(f"[Scraper] ✅ Targeted scrape stored {total_stored} new jobs")
    return total_stored


async def run_scrape() -> int:
    """Fetch jobs from all sources, deduplicate, embed, and store. Returns count added."""
    global _last_run, _jobs_scraped

    print("[Scraper] Starting job scrape...")

    # Fetch from all APIs concurrently
    results = await asyncio.gather(
        fetch_arbeitnow(),
        fetch_remotive(),
        fetch_the_muse(),
        fetch_remoteok(),
        fetch_jobicy(),
        fetch_himalayas(),
        fetch_findwork(),
        return_exceptions=True,
    )

    all_new = []
    for r in results:
        if isinstance(r, list):
            all_new.extend(r)

    if not all_new:
        print("[Scraper] No jobs fetched.")
        return 0

    # Deduplicate against existing stored jobs
    existing = get_all_jobs(limit=5000)
    unique_jobs = _deduplicate(all_new, existing)
    print(f"[Scraper] {len(all_new)} fetched, {len(unique_jobs)} new after dedup")

    if not unique_jobs:
        _last_run = datetime.now(timezone.utc).isoformat()
        return 0

    # Embed and store in batches of 10
    batch_size = 10
    total_stored = 0
    for i in range(0, len(unique_jobs), batch_size):
        batch = unique_jobs[i:i + batch_size]
        texts = [
            (f"{job.get('title','')} {job.get('company','')} {job.get('description','')[:300]} {' '.join(job.get('skills_required',[]))}".strip() or "job listing")
            for job in batch
        ]
        embed_results = await asyncio.gather(*[embed_text(t) for t in texts], return_exceptions=True)
        valid_batch, vectors = [], []
        for job, vec in zip(batch, embed_results):
            if isinstance(vec, Exception):
                print(f"[Scraper] Embedding failed for job: {vec}")
                continue
            if vec and isinstance(vec, list) and len(vec) > 0:
                valid_batch.append(job)
                vectors.append(vec)
        if valid_batch:
            count = store_jobs_batch(valid_batch, vectors)
            total_stored += count

    _last_run = datetime.now(timezone.utc).isoformat()
    _jobs_scraped = total_stored
    print(f"[Scraper] ✅ Stored {total_stored} new jobs")
    return total_stored


# ── Helpers ────────────────────────────────────────────────────────────────

_SKILL_KEYWORDS = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "Rust", "C++",
    "React", "Node.js", "FastAPI", "Django", "Flask",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "scikit-learn",
    "NLP", "LLM", "RAG", "Data Science", "Spark", "Kafka",
    "Git", "REST", "GraphQL", "Microservices",
]


def _extract_skills_from_text(text: str) -> List[str]:
    text_lower = text.lower()
    return [s for s in _SKILL_KEYWORDS if s.lower() in text_lower][:10]


def _domain_from_company(name: str) -> str:
    """Very rough domain guess from company name for Clearbit logos."""
    return name.lower().replace(" ", "").replace(",", "").replace(".", "") + ".com"
