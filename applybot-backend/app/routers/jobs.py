from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import (
    Job, JobCreate, JobWithScore,
    SearchRequest, SearchResponse
)
from app.services.vector_store import (
    store_job, store_jobs_batch, get_job,
    get_all_jobs, delete_job
)
from app.services.job_matcher import match_jobs_to_resume, group_jobs_by_company
from app.services.embeddings import embed_text

router = APIRouter()


@router.post("/", response_model=Job)
async def create_job(job: JobCreate):
    """Create a new job posting."""
    job_data = job.model_dump()

    # Embed job for semantic search
    text = f"{job_data.get('title', '')} {job_data.get('company', '')} {job_data.get('description', '')} {' '.join(job_data.get('skills_required', []))}"
    try:
        vector = await embed_text(text.strip())
    except Exception as e:
        print(f"[Job embed warning] {e}")
        vector = None

    job_id = store_job(job_data, vector)
    job_data["id"] = job_id
    return Job(**job_data)


@router.post("/batch", response_model=dict)
async def create_jobs_batch(jobs: List[JobCreate]):
    """Create multiple job postings at once."""
    job_dicts = [j.model_dump() for j in jobs]

    # Embed all jobs
    vectors = []
    for job in job_dicts:
        text = f"{job.get('title', '')} {job.get('company', '')} {job.get('description', '')} {' '.join(job.get('skills_required', []))}"
        try:
            vec = await embed_text(text.strip())
        except Exception:
            vec = None
        vectors.append(vec)

    count = store_jobs_batch(job_dicts, vectors)
    return {"created": count}


@router.get("/", response_model=List[Job])
async def list_jobs(limit: int = 100):
    """List all jobs."""
    jobs = get_all_jobs(limit)
    return [Job(**j) for j in jobs]


@router.get("/{job_id}", response_model=Job)
async def get_job_by_id(job_id: str):
    """Get a job by ID."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return Job(**job)


@router.delete("/{job_id}")
async def delete_job_by_id(job_id: str):
    """Delete a job."""
    delete_job(job_id)
    return {"deleted": True}


@router.post("/search", response_model=SearchResponse)
async def search_jobs(request: SearchRequest):
    """Semantic search + optional LLM re-rank jobs for a given resume."""
    filters = request.filters.model_dump(exclude_none=True) if request.filters else None

    matched = match_jobs_to_resume(
        resume_id=request.resume_id,
        limit=request.limit,
        filters=filters,
        use_llm_rerank=request.use_llm_rerank,
        llm_provider=request.llm_provider,
    )

    jobs_with_scores = [
        JobWithScore(
            job=Job(**m),
            relevancy_score=m.get("relevancy_score", 0.5),
            match_reasons=m.get("match_reasons", []),
            skill_matches=m.get("skill_matches", []),
            missing_skills=m.get("missing_skills", []),
        )
        for m in matched
    ]

    return SearchResponse(
        jobs=jobs_with_scores,
        total=len(jobs_with_scores),
        resume_id=request.resume_id,
    )


@router.post("/search/grouped")
async def search_jobs_grouped(request: SearchRequest):
    """Search jobs and group results by company.
    Returns: { "CompanyName": [job, job, ...], ... }
    """
    filters = request.filters.model_dump(exclude_none=True) if request.filters else None

    matched = match_jobs_to_resume(
        resume_id=request.resume_id,
        limit=request.limit,
        filters=filters,
        use_llm_rerank=request.use_llm_rerank,
        llm_provider=request.llm_provider,
    )

    # Build flat { company_name: [jobs] } — exactly what JobBrowser.jsx expects
    grouped: dict = {}
    for job in matched:
        company = job.get("company", "Unknown")
        if company not in grouped:
            grouped[company] = []
        # Attach score directly on the job dict (frontend reads job.score)
        job_out = {**job}
        job_out["score"] = job_out.pop("relevancy_score", 0.5)
        grouped[company].append(job_out)

    return grouped
