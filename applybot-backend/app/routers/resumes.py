import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.models.schemas import Resume, ResumeUpdate
from app.services.resume_parser import parse_resume_pdf
from app.services.vector_store import store_resume, get_resume
from app.services.embeddings import embed_text

router = APIRouter()


@router.post("/upload", response_model=Resume)
async def upload_resume(file: UploadFile = File(...)):
    """Upload a PDF resume. Parses text, embeds it, and stores in Qdrant."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    parsed = parse_resume_pdf(file_bytes)

    resume_id = str(uuid.uuid4())
    parsed["id"] = resume_id

    # Embed the raw text for semantic search
    text_to_embed = (parsed.get("summary") or "") + " " + " ".join(parsed.get("skills", []))
    try:
        vector = await embed_text(text_to_embed.strip() or "resume")
    except Exception as e:
        print(f"[Embedding warning] {e} — storing with zero vector")
        vector = None

    store_resume(resume_id, parsed, vector)
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
