import json
from typing import List, Dict, Any, Optional
from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODEL


_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def rerank_jobs(resume_text: str, jobs: List[Dict[str, Any]], limit: int = 20) -> List[Dict[str, Any]]:
    """
    Use Groq LLM to re-rank jobs by relevance to the resume.
    Returns enriched job dicts with relevancy_score, match_reasons, skill_matches, missing_skills.
    """
    if not jobs:
        return []

    client = get_client()

    job_summaries = []
    for i, job in enumerate(jobs[:30]):  # cap at 30 for token budget
        job_summaries.append(
            f"Job {i}: {job.get('title', 'N/A')} at {job.get('company', 'N/A')} | "
            f"Dept: {job.get('department', 'N/A')} | "
            f"Skills: {', '.join(job.get('skills_required', []))}"
        )

    prompt = f"""You are an expert job-matching AI. Given the resume summary and job listings below, 
score each job from 0-100 for relevance.

RESUME (first 1000 chars):
{resume_text[:1000]}

JOBS:
{chr(10).join(job_summaries)}

Respond ONLY with a JSON array like:
[
  {{"job_index": 0, "score": 85, "match_reasons": ["Strong Python match"], "skill_matches": ["Python"], "missing_skills": ["Scala"]}},
  ...
]
Include ALL {len(job_summaries)} jobs. Sort by score descending."""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000,
        )
        content = response.choices[0].message.content.strip()
        # Extract JSON array from response
        start = content.find("[")
        end = content.rfind("]") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON array in response")
        rankings = json.loads(content[start:end])
    except Exception as e:
        print(f"[LLM rerank error] {e} — falling back to vector scores")
        return jobs[:limit]

    result = []
    for rank in sorted(rankings, key=lambda x: x.get("score", 0), reverse=True):
        idx = rank.get("job_index", -1)
        if 0 <= idx < len(jobs):
            enriched = dict(jobs[idx])
            enriched["relevancy_score"] = rank.get("score", 50) / 100.0
            enriched["match_reasons"] = rank.get("match_reasons", [])
            enriched["skill_matches"] = rank.get("skill_matches", [])
            enriched["missing_skills"] = rank.get("missing_skills", [])
            result.append(enriched)

    return result[:limit]


async def generate_form_values(
    job: Dict[str, Any],
    resume: Dict[str, Any],
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Use Groq to generate tailored application form field values.
    Returns a dict of field_name -> value.
    """
    client = get_client()

    prompt = f"""You are an AI job application assistant. Fill in application form fields based on:

JOB:
Title: {job.get('title')}
Company: {job.get('company')}
Description: {str(job.get('description', ''))[:500]}
Required Skills: {', '.join(job.get('skills_required', []))}

CANDIDATE RESUME DATA:
Name: {resume.get('name', 'John Doe')}
Email: {resume.get('email', '')}
Phone: {resume.get('phone', '')}
Location: {resume.get('location', '')}
Skills: {', '.join(resume.get('skills', []))}
Summary: {str(resume.get('summary', ''))[:300]}

{f"Custom instructions: {custom_instructions}" if custom_instructions else ""}

Respond ONLY with JSON:
{{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "current_title": "",
  "current_company": "",
  "years_experience": "",
  "salary_expectation": "",
  "degree": "",
  "university": "",
  "graduation_year": "",
  "work_auth": "US Citizen",
  "willing_to_relocate": true,
  "summary": "A 2-3 sentence tailored professional summary for this specific job",
  "cover_letter": "A short 3-paragraph cover letter tailored to this job"
}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )
        content = response.choices[0].message.content.strip()
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON in response")
        return json.loads(content[start:end])
    except Exception as e:
        print(f"[LLM form fill error] {e}")
        # Fallback: populate from resume data
        name_parts = (resume.get("name") or "").split(" ", 1)
        return {
            "first_name": name_parts[0] if name_parts else "",
            "last_name": name_parts[1] if len(name_parts) > 1 else "",
            "email": resume.get("email", ""),
            "phone": resume.get("phone", ""),
            "location": resume.get("location", ""),
            "work_auth": "US Citizen",
            "willing_to_relocate": True,
            "summary": resume.get("summary", ""),
            "cover_letter": "",
        }
