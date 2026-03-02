from fastapi import APIRouter, BackgroundTasks
from app.services.job_scraper import run_scrape, get_status

router = APIRouter()


@router.post("/run")
async def trigger_scrape(background_tasks: BackgroundTasks):
    """Manually trigger a job scrape in the background."""
    background_tasks.add_task(run_scrape)
    return {"message": "Scrape started in background"}


@router.get("/status")
async def scraper_status():
    """Get the last scrape time and job count."""
    return get_status()
