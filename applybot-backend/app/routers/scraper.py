from fastapi import APIRouter, BackgroundTasks
from app.services.job_scraper import run_scrape, run_resume_targeted_scrape, get_status

router = APIRouter()


@router.post("/run")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a generic job scrape in the background."""
    background_tasks.add_task(run_scrape)
    return {"message": "Scrape started in background", "targeted": False}


@router.post("/run-for-resume/{resume_id}")
async def trigger_resume_scrape(resume_id: str, background_tasks: BackgroundTasks):
    """Trigger a resume-targeted job scrape. Uses the resume's search profile
    to fetch and filter jobs relevant to this specific candidate."""
    from app.services.vector_store import get_resume
    resume = get_resume(resume_id)
    search_profile = resume.get("search_profile") if resume else None

    if search_profile:
        background_tasks.add_task(run_resume_targeted_scrape, search_profile)
        return {"message": "Targeted scrape started in background", "targeted": True}
    else:
        # No profile yet — run a generic scrape
        background_tasks.add_task(run_scrape)
        return {"message": "Generic scrape started (profile not ready yet)", "targeted": False}


@router.get("/status")
async def scraper_status():
    """Get the last scrape time and job count."""
    return get_status()
