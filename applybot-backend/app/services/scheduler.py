import asyncio
from app.services.job_scraper import run_scrape

_scraper_task = None
SCRAPE_INTERVAL_SECONDS = 3600  # 1 hour


async def _scraper_loop():
    """Background loop: scrape on startup, then every hour."""
    # Run immediately on first start
    try:
        await run_scrape()
    except Exception as e:
        print(f"[Scheduler] Initial scrape error: {e}")

    while True:
        await asyncio.sleep(SCRAPE_INTERVAL_SECONDS)
        try:
            count = await run_scrape()
            print(f"[Scheduler] Hourly scrape complete: {count} new jobs")
        except Exception as e:
            print(f"[Scheduler] Hourly scrape error: {e}")


def start_scheduler():
    """Launch the scraper loop as a fire-and-forget asyncio task."""
    global _scraper_task
    loop = asyncio.get_event_loop()
    _scraper_task = loop.create_task(_scraper_loop())
    print("[Scheduler] ✅ Hourly job scraper started")


def stop_scheduler():
    global _scraper_task
    if _scraper_task and not _scraper_task.done():
        _scraper_task.cancel()
        print("[Scheduler] Scraper stopped")
