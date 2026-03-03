from typing import List, Dict, Any, Optional
from app.services.vector_store import search_jobs_by_vector, get_resume_vector, get_all_jobs, get_resume
from app.services.llm import rerank_jobs
from app.services.embeddings import embed_text_sync


def match_jobs_to_resume(
    resume_id: str,
    limit: int = 20,
    filters: Optional[Dict[str, Any]] = None,
    use_llm_rerank: bool = False,
    llm_provider: str = "groq",
) -> List[Dict[str, Any]]:
    """
    Find the best matching jobs for a given resume.
    1. If the resume has a search_profile, embed the profile's search_query for richer vector search.
       Otherwise fall back to the stored resume vector.
    2. Optionally re-rank with Groq LLM using the full search profile for context.
    """
    resume = get_resume(resume_id) or {}
    search_profile = resume.get("search_profile")

    # Use the search profile's rich search_query for the vector lookup when available.
    # This captures "what role this person should be in" rather than just their raw resume text.
    query_vector = None
    if search_profile and search_profile.get("search_query"):
        try:
            query_vector = embed_text_sync(search_profile["search_query"])
        except Exception as e:
            print(f"[Matcher] Failed to embed search_query, falling back to resume vector: {e}")

    if query_vector is None:
        query_vector = get_resume_vector(resume_id)

    if query_vector and any(v != 0.0 for v in query_vector):
        matched = search_jobs_by_vector(
            query_vector=query_vector,
            limit=limit * 2,
            filters=filters,
        )
    else:
        matched = get_all_jobs(limit=limit * 2)
        for job in matched:
            job.setdefault("relevancy_score", 0.5)

    if not matched:
        return []

    if use_llm_rerank:
        resume_text = resume.get("raw_text") or _build_resume_text(resume)
        matched = rerank_jobs(
            resume_text,
            matched,
            limit=limit,
            search_profile=search_profile,
            llm_provider=llm_provider,
        )
    else:
        for job in matched:
            score = job.get("relevancy_score", 0.5)
            if score > 1.0:
                score = score / 100.0
            job["relevancy_score"] = round(score, 3)
            job.setdefault("match_reasons", [])
            job.setdefault("skill_matches", [])
            job.setdefault("missing_skills", [])
        matched = sorted(matched, key=lambda x: x["relevancy_score"], reverse=True)[:limit]

    return matched


def group_jobs_by_company(jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Group a flat list of job dicts by company name."""
    groups: Dict[str, Any] = {}
    for job in jobs:
        company = job.get("job", {}).get("company") or job.get("company", "Unknown")
        if company not in groups:
            groups[company] = {
                "company": company,
                "logo_url": job.get("job", {}).get("logo_url") or job.get("logo_url", ""),
                "jobs": [],
                "best_score": 0.0,
            }
        groups[company]["jobs"].append(job)
        score = job.get("relevancy_score", 0)
        if score > groups[company]["best_score"]:
            groups[company]["best_score"] = score
    return groups


def _build_resume_text(resume: Dict[str, Any]) -> str:
    parts = [
        resume.get("name", ""),
        resume.get("summary", ""),
        "Skills: " + ", ".join(resume.get("skills", [])),
    ]
    for exp in resume.get("experience", []):
        parts.append(exp.get("raw", ""))
    return "\n".join(filter(None, parts))
