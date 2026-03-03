import json
from typing import List, Dict, Any, Optional
from groq import Groq
import anthropic
from app.config import (
    GROQ_API_KEY, GROQ_MODEL, GROQ_PARSE_MODEL,
    ANTHROPIC_API_KEY, CLAUDE_MODEL, CLAUDE_PARSE_MODEL,
)


# ── Lazy clients ─────────────────────────────────────────────────────────────

_groq_client = None
_anthropic_client = None


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


def _get_anthropic() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _anthropic_client


# ── Unified LLM call ─────────────────────────────────────────────────────────

def _call_llm(prompt: str, use_smart_model: bool, llm_provider: str, max_tokens: int = 2000, temperature: float = 0.1) -> str:
    """Call the selected LLM provider and return the response text."""
    if llm_provider == "claude":
        model = CLAUDE_PARSE_MODEL if use_smart_model else CLAUDE_MODEL
        client = _get_anthropic()
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    else:
        model = GROQ_PARSE_MODEL if use_smart_model else GROQ_MODEL
        client = _get_groq()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()


# ── Public functions ──────────────────────────────────────────────────────────

def rerank_jobs(
    resume_text: str,
    jobs: List[Dict[str, Any]],
    limit: int = 20,
    search_profile: Optional[Dict[str, Any]] = None,
    llm_provider: str = "groq",
) -> List[Dict[str, Any]]:
    """
    Use LLM to re-rank jobs by relevance to the resume.
    Optionally uses a search_profile for richer context (target titles, industries, seniority).
    Returns enriched job dicts with relevancy_score, match_reasons, skill_matches, missing_skills.
    """
    if not jobs:
        return []

    job_summaries = []
    for i, job in enumerate(jobs[:30]):  # cap at 30 for token budget
        job_summaries.append(
            f"Job {i}: {job.get('title', 'N/A')} at {job.get('company', 'N/A')} | "
            f"Location: {job.get('location', 'N/A')} | "
            f"Skills: {', '.join(job.get('skills_required', []))}"
        )

    profile_context = ""
    if search_profile:
        profile_context = f"""
CANDIDATE PROFILE:
Who they are: {search_profile.get('candidate_summary', '')}
Target roles: {', '.join(search_profile.get('target_titles', []))}
Target industries: {', '.join(search_profile.get('target_industries', []))}
Seniority: {search_profile.get('seniority', 'mid')}
Key strengths: {', '.join(search_profile.get('key_strengths', []))}

Prioritize jobs that match the target roles and industries above.
Penalize jobs that are too junior/senior or in unrelated fields.
"""

    prompt = f"""You are an expert job-matching AI. Score each job 0-100 for relevance to this candidate.
{profile_context}
RESUME (first 1000 chars):
{resume_text[:1000]}

JOBS:
{chr(10).join(job_summaries)}

Scoring guidance:
- 90-100: Excellent match — title, industry, and skills align perfectly
- 70-89: Good match — most requirements fit, minor gaps
- 50-69: Partial match — some relevant skills but significant gaps or wrong industry
- Below 50: Poor match — different field, wrong seniority, or missing core skills

Respond ONLY with a JSON array like:
[
  {{"job_index": 0, "score": 85, "match_reasons": ["Strong Python match", "FinTech industry match"], "skill_matches": ["Python"], "missing_skills": ["Scala"]}},
  ...
]
Include ALL {len(job_summaries)} jobs. Sort by score descending."""

    try:
        content = _call_llm(prompt, use_smart_model=False, llm_provider=llm_provider, max_tokens=2000, temperature=0.1)
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


def generate_job_search_profile(resume_data: Dict[str, Any], llm_provider: str = "groq") -> Dict[str, Any]:
    """
    Holistically understand the resume and generate a targeted job search profile.
    The LLM figures out what this person does, what roles suit them, and what to prioritize.
    Returns a dict with candidate_summary, target_titles, target_industries, seniority,
    search_keywords, search_query, preferred_remote, key_strengths.
    """
    experience_text = "\n".join(
        exp.get("raw", "") for exp in resume_data.get("experience", [])[:5]
    )
    education_text = "\n".join(
        edu.get("raw", "") for edu in resume_data.get("education", [])[:3]
    )

    prompt = f"""You are an expert career counselor. Analyze this resume and generate a targeted job search profile.

RESUME:
Name: {resume_data.get('name', '')}
Location: {resume_data.get('location', '')}
Summary: {resume_data.get('summary', '')}
Skills: {', '.join(resume_data.get('skills', []))}

Experience:
{experience_text}

Education:
{education_text}

Based on this resume, produce a job search profile that captures what this person does and what roles they should target.

Respond ONLY with a JSON object:
{{
  "candidate_summary": "2-3 sentence plain-English description of this person's expertise and background",
  "target_titles": ["Job Title 1", "Job Title 2", "Job Title 3", "Job Title 4", "Job Title 5"],
  "target_industries": ["Industry 1", "Industry 2", "Industry 3"],
  "seniority": "entry or mid or senior or lead or executive",
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "search_query": "A rich 3-5 sentence natural-language query that describes the ideal job for this candidate — written as if it were a job description matching their background",
  "preferred_remote": true,
  "key_strengths": ["strength1", "strength2", "strength3"]
}}

Rules:
- target_titles must be specific and realistic (e.g. "Senior Python Backend Engineer", not "Software Developer")
- search_keywords are the most important technical/domain terms for their profile
- search_query should be comprehensive enough to match relevant job postings via semantic search
- Do NOT invent skills or experience not present in the resume"""

    try:
        content = _call_llm(prompt, use_smart_model=True, llm_provider=llm_provider, max_tokens=1000, temperature=0.1)
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON in response")
        return json.loads(content[start:end])
    except Exception as e:
        print(f"[LLM job profile error] {e} — using fallback profile")
        return {
            "candidate_summary": resume_data.get("summary", ""),
            "target_titles": [],
            "target_industries": [],
            "seniority": "mid",
            "search_keywords": resume_data.get("skills", [])[:5],
            "search_query": (resume_data.get("summary", "") + " " + " ".join(resume_data.get("skills", []))).strip(),
            "preferred_remote": True,
            "key_strengths": [],
        }


def parse_resume_with_llm(raw_text: str, llm_provider: str = "groq") -> Dict[str, Any]:
    """
    Use LLM to extract structured fields from raw resume text.
    Returns a dict with name, email, phone, location, summary, skills, experience, education.
    """
    prompt = f"""You are an expert resume parser. Extract structured information from the resume text below.

RESUME TEXT:
{raw_text[:4000]}

Respond ONLY with a JSON object with exactly these fields:
{{
  "name": "full name of the candidate",
  "email": "email address",
  "phone": "phone number",
  "location": "city, state or country",
  "summary": "professional summary or objective in 2-4 sentences",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{"raw": "Job Title at Company (dates) — key responsibilities/achievements"}},
    {{"raw": "..."}}
  ],
  "education": [
    {{"raw": "Degree, Institution, Year"}},
    {{"raw": "..."}}
  ]
}}

Rules:
- Use empty string "" for any missing text field
- Use empty array [] for any missing list field
- Extract ALL technical and soft skills explicitly mentioned
- Include up to 5 most recent experience entries
- Include up to 4 education entries
- Do NOT invent or infer anything not present in the resume text"""

    content = _call_llm(prompt, use_smart_model=True, llm_provider=llm_provider, max_tokens=2000, temperature=0.0)
    start = content.find("{")
    end = content.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(content[start:end])


async def generate_form_values(
    job: Dict[str, Any],
    resume: Dict[str, Any],
    custom_instructions: Optional[str] = None,
    llm_provider: str = "groq",
) -> Dict[str, Any]:
    """
    Use LLM to generate tailored application form field values.
    Returns a dict of field_name -> value.
    """
    experience_text = "\n".join(
        exp.get("raw", "") for exp in resume.get("experience", [])[:3]
    )
    education_text = "\n".join(
        edu.get("raw", "") for edu in resume.get("education", [])[:2]
    )

    prompt = f"""You are an AI job application assistant. Fill in every application form field from the candidate's resume.

JOB:
Title: {job.get('title')}
Company: {job.get('company')}
Description: {str(job.get('description', ''))[:600]}
Required Skills: {', '.join(job.get('skills_required', []))}

CANDIDATE RESUME:
Name: {resume.get('name', '')}
Email: {resume.get('email', '')}
Phone: {resume.get('phone', '')}
Location: {resume.get('location', '')}
Skills: {', '.join(resume.get('skills', []))}
Summary: {str(resume.get('summary', ''))[:400]}

Experience:
{experience_text}

Education:
{education_text}

{f"Custom instructions: {custom_instructions}" if custom_instructions else ""}

Rules:
- Fill every field accurately from the resume. Do NOT invent data not in the resume.
- For current_title and current_company: use the most recent experience entry.
- For years_experience: estimate from the experience dates (return as a number string like "5").
- For salary_expectation: estimate based on role seniority (e.g. "$130,000 - $160,000").
- Write the cover_letter in 3 paragraphs: (1) why excited about this company, (2) specific relevant experience, (3) closing.
- Write the summary as a 2-3 sentence tailored pitch for THIS specific role.

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
  "summary": "2-3 sentence tailored professional summary for this specific job",
  "cover_letter": "3-paragraph cover letter tailored to this role and company"
}}"""

    try:
        content = _call_llm(prompt, use_smart_model=False, llm_provider=llm_provider, max_tokens=1500, temperature=0.3)
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON in response")
        return json.loads(content[start:end])
    except Exception as e:
        print(f"[LLM form fill error] {e}")
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
