"""
Job Scraper Router

Exposes endpoints to trigger multi-platform scrapes, poll status,
and query which platforms are connected for a given user.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.routers.auth import get_current_user
from app.services.job_scraper import run_scrape, run_resume_targeted_scrape, get_status

router = APIRouter()

# ── In-memory scrape state (MVP; replace with DB/Redis for production) ─────
_user_scrape_state: Dict[str, Dict[str, Any]] = {}


# ── Pydantic models ────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    keywords: Optional[List[str]] = None
    location: Optional[str] = None
    remote_only: bool = False
    posted_within_days: int = 30
    platforms: Optional[List[str]] = None
    limit_per_platform: int = 50


class ScrapeStatus(BaseModel):
    status: str                   # "idle" | "running" | "complete" | "error"
    platforms_active: List[str]
    jobs_found: int
    jobs_stored: int
    errors: List[str]
    started_at: Optional[str]
    completed_at: Optional[str]


# ── Existing public endpoints (no auth required for backwards compat) ──────

@router.post("/run")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a generic job scrape in the background."""
    background_tasks.add_task(run_scrape)
    return {"message": "Scrape started in background", "targeted": False}


@router.post("/run-for-resume/{resume_id}")
async def trigger_resume_scrape(resume_id: str, background_tasks: BackgroundTasks):
    """Trigger a resume-targeted job scrape."""
    from app.services.vector_store import get_resume
    resume = get_resume(resume_id)
    search_profile = resume.get("search_profile") if resume else None

    if search_profile:
        background_tasks.add_task(run_resume_targeted_scrape, search_profile)
        return {"message": "Targeted scrape started in background", "targeted": True}
    else:
        background_tasks.add_task(run_scrape)
        return {"message": "Generic scrape started (profile not ready yet)", "targeted": False}


@router.get("/status")
async def scraper_status():
    """Get the last scrape time and job count (legacy endpoint)."""
    return get_status()


# ── New authenticated multi-platform endpoints ─────────────────────────────

@router.post("/run/multi-platform")
async def trigger_multi_platform_scrape(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
):
    """
    Trigger a multi-platform scrape using the user's stored credentials.
    Returns immediately; scraping runs in the background.
    Poll /status/{user_id} for progress.
    """
    user_id = current_user["user_id"]
    _user_scrape_state[user_id] = {
        "status": "running",
        "platforms_active": [],
        "jobs_found": 0,
        "jobs_stored": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    background_tasks.add_task(_run_multi_platform_task, user_id, request)
    return {
        "message": "Multi-platform scrape started",
        "status_url": f"/api/scraper/status/{user_id}",
    }


@router.post("/run-for-resume/{resume_id}/multi-platform")
async def trigger_resume_multi_platform_scrape(
    resume_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
):
    """
    Trigger a multi-platform scrape using keywords derived from the resume.
    """
    from app.services.vector_store import get_resume
    resume = get_resume(resume_id)
    search_profile = resume.get("search_profile") if resume else None
    keywords = search_profile.get("search_keywords", [])[:5] if search_profile else []

    user_id = current_user["user_id"]
    request = ScrapeRequest(keywords=keywords or None)
    _user_scrape_state[user_id] = {
        "status": "running",
        "platforms_active": [],
        "jobs_found": 0,
        "jobs_stored": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    background_tasks.add_task(_run_multi_platform_task, user_id, request)
    return {
        "message": "Resume-targeted multi-platform scrape started",
        "resume_id": resume_id,
        "keywords_used": keywords,
        "status_url": f"/api/scraper/status/{user_id}",
    }


@router.get("/status/{user_id}", response_model=ScrapeStatus)
async def get_user_scrape_status(
    user_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Get current multi-platform scrape status for a user."""
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    state = _user_scrape_state.get(user_id, {
        "status": "idle",
        "platforms_active": [],
        "jobs_found": 0,
        "jobs_stored": 0,
        "errors": [],
        "started_at": None,
        "completed_at": None,
    })
    return ScrapeStatus(**state)


@router.get("/platforms")
async def get_platform_status(current_user: Dict = Depends(get_current_user)):
    """
    Get which platforms are connected for the current user,
    including last scrape time and job counts.
    """
    from app.services.credential_manager import CredentialManager
    cm = CredentialManager()
    return cm.get_credential_status(current_user["user_id"])


@router.post("/test-connection")
async def test_platform_connection(platform: str, credentials: Dict):
    """Test if credentials work for a platform (lightweight reachability check)."""
    from app.routers.auth import _test_connection
    result = await _test_connection(
        platform=platform,
        email=credentials.get("email", ""),
        password=credentials.get("password", ""),
        workday_url=credentials.get("workday_url"),
    )
    return result


# ── Background task ────────────────────────────────────────────────────────

async def _run_multi_platform_task(user_id: str, request: ScrapeRequest) -> None:
    """Background task: run multi-platform scrape and store results."""
    from app.services.credential_manager import CredentialManager
    from app.services.embeddings import embed_text
    from app.services.scrapers.scraper_orchestrator import ScraperOrchestrator
    from app.services.vector_store import get_all_jobs, store_jobs_batch

    state = _user_scrape_state[user_id]
    orchestrator = ScraperOrchestrator(CredentialManager())

    try:
        init_results = await orchestrator.initialize_scrapers(user_id)
        active_platforms = [p for p, ok in init_results.items() if ok]
        state["platforms_active"] = active_platforms

        if not active_platforms:
            state["status"] = "error"
            state["errors"].append("No platforms could be initialized. Please check your credentials.")
            state["completed_at"] = datetime.now(timezone.utc).isoformat()
            return

        keywords = request.keywords or ["software engineer", "developer", "data scientist"]

        scraped_jobs = await orchestrator.search_all_platforms(
            keywords=keywords,
            location=request.location,
            remote_only=request.remote_only,
            posted_within_days=request.posted_within_days,
            limit_per_platform=request.limit_per_platform,
        )

        state["jobs_found"] = len(scraped_jobs)

        if not scraped_jobs:
            state["status"] = "complete"
            state["completed_at"] = datetime.now(timezone.utc).isoformat()
            return

        # Convert ScrapedJob -> dict format expected by vector store
        job_dicts = [_scraped_to_dict(j) for j in scraped_jobs]

        # Deduplicate against already-stored jobs
        existing = get_all_jobs(limit=5000)
        existing_keys = {
            (j.get("title", "").lower().strip(), j.get("company", "").lower().strip())
            for j in existing
        }
        new_jobs = [
            j for j in job_dicts
            if (j["title"].lower().strip(), j["company"].lower().strip()) not in existing_keys
        ]

        # Embed and store in batches
        batch_size = 10
        total_stored = 0
        for i in range(0, len(new_jobs), batch_size):
            batch = new_jobs[i:i + batch_size]
            texts = [
                f"{j.get('title','')} {j.get('company','')} {j.get('description','')[:300]} {' '.join(j.get('skills_required',[]))}"
                for j in batch
            ]
            embed_results = await asyncio.gather(*[embed_text(t) for t in texts], return_exceptions=True)
            valid_batch, vectors = [], []
            for job, vec in zip(batch, embed_results):
                if isinstance(vec, Exception):
                    continue
                if vec and isinstance(vec, list):
                    valid_batch.append(job)
                    vectors.append(vec)
            if valid_batch:
                total_stored += store_jobs_batch(valid_batch, vectors)

        state["jobs_stored"] = total_stored
        state["status"] = "complete"

    except Exception as exc:
        state["status"] = "error"
        state["errors"].append(str(exc))
        import logging
        logging.getLogger(__name__).exception("[MultiScrape] Task failed for user %s: %s", user_id, exc)
    finally:
        state["completed_at"] = datetime.now(timezone.utc).isoformat()
        await orchestrator.close_all()


def _scraped_to_dict(job) -> Dict[str, Any]:
    """Convert ScrapedJob dataclass to the dict format used by the vector store."""
    salary = None
    if job.salary_min and job.salary_max:
        salary = f"${job.salary_min:,} – ${job.salary_max:,} {job.salary_currency}"
    elif job.salary_min:
        salary = f"${job.salary_min:,}+ {job.salary_currency}"

    return {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "type": job.job_type,
        "salary": salary,
        "description": job.description,
        "requirements": job.requirements,
        "skills_required": job.skills_required,
        "posted": job.posted_date,
        "apply_url": job.application_url,
        "logo_url": job.company_logo_url or f"https://logo.clearbit.com/{job.company.lower().replace(' ', '')}.com",
        "source_platform": job.source_platform,
        "easy_apply": job.easy_apply,
        "company_rating": job.company_rating,
        "ats_type": job.ats_type,
    }
