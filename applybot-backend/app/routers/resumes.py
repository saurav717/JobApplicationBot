import asyncio
import uuid
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from app.models.schemas import Resume, ResumeUpdate
from app.services.resume_parser import parse_resume_pdf
from app.services.vector_store import store_resume, get_resume
from app.services.embeddings import embed_text
from app.services.llm import generate_job_search_profile
from app.services.job_scraper import run_resume_targeted_scrape

router = APIRouter()


async def _build_profile_and_scrape(resume_id: str, parsed: dict, llm_provider: str = "groq") -> None:
    """Background task: generate job search profile then run a targeted scrape."""
    try:
        profile = generate_job_search_profile(parsed, llm_provider=llm_provider)
        print(f"[Resume] Job search profile generated: {profile.get('target_titles', [])}")
    except Exception as e:
        print(f"[Resume] Profile generation failed: {e}")
        return

    # Persist the profile into the stored resume so the matcher can use it
    existing = get_resume(resume_id) or {}
    existing["search_profile"] = profile

    # Re-embed using the richer search_query for better vector matching
    search_query = profile.get("search_query", "")
    if search_query:
        try:
            new_vector = await embed_text(search_query)
            store_resume(resume_id, existing, new_vector)
            print(f"[Resume] Re-embedded with search_query vector")
        except Exception as e:
            print(f"[Resume] Re-embed failed: {e} — keeping original vector")
            store_resume(resume_id, existing)
    else:
        store_resume(resume_id, existing)

    # Kick off a targeted scrape so relevant jobs exist before the user searches
    try:
        await run_resume_targeted_scrape(profile)
    except Exception as e:
        print(f"[Resume] Targeted scrape failed: {e}")


@router.post("/upload", response_model=Resume)
async def upload_resume(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    llm_provider: str = Form("groq"),
):
    """Upload a PDF resume. Parses, stores, then generates a job search profile
    and runs a targeted job scrape in the background."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    parsed = parse_resume_pdf(file_bytes, llm_provider=llm_provider)

    resume_id = str(uuid.uuid4())
    parsed["id"] = resume_id

    # Initial embed using summary + skills so the resume is stored immediately
    text_to_embed = (parsed.get("summary") or "") + " " + " ".join(parsed.get("skills", []))
    try:
        vector = await embed_text(text_to_embed.strip() or "resume")
    except Exception as e:
        print(f"[Embedding warning] {e} — storing with zero vector")
        vector = None

    store_resume(resume_id, parsed, vector)

    # Generate search profile + targeted scrape in the background so the upload
    # returns immediately to the user
    if background_tasks is not None:
        background_tasks.add_task(_build_profile_and_scrape, resume_id, dict(parsed), llm_provider)
    else:
        asyncio.create_task(_build_profile_and_scrape(resume_id, dict(parsed), llm_provider))

    return Resume(**parsed)


@router.get("/{resume_id}", response_model=Resume)
async def get_resume_by_id(resume_id: str):
    """Retrieve a resume by ID."""
    resume = get_resume(resume_id)
    if not resume:
        raise HTTPException(404, "Resume not found")
    return Resume(**resume)


@router.put("/{resume_id}", response_model=Resume)
async def update_resume(resume_id: str, data: ResumeUpdate):
    """Update resume fields."""
    existing = get_resume(resume_id)
    if not existing:
        raise HTTPException(404, "Resume not found")

    updated = {**existing, **{k: v for k, v in data.model_dump().items() if v is not None}}
    store_resume(resume_id, updated)
    return Resume(**updated)
