from typing import Optional
from app.models.schemas import ApplicationForm
from app.services.vector_store import get_job, get_resume
from app.services.llm import generate_form_values


async def generate_application_form(
    job_id: str,
    resume_id: str,
    custom_instructions: Optional[str] = None
) -> ApplicationForm:
    """
    Build a completely filled ApplicationForm for a job + resume pair.
    """
    job = get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    resume = get_resume(resume_id)
    if not resume:
        raise ValueError(f"Resume {resume_id} not found")

    fields = await generate_form_values(job, resume, custom_instructions)

    # Parse name into parts
    first_name = fields.get("first_name", "") or (resume.get("name", "").split(" ", 1)[0] if resume.get("name") else "")
    last_name = fields.get("last_name", "") or (resume.get("name", "").split(" ", 1)[1] if resume.get("name") and " " in resume.get("name", "") else "")

    return ApplicationForm(
        job_id=job_id,
        resume_id=resume_id,
        personal_info={
            "first_name": first_name,
            "last_name": last_name,
            "email": fields.get("email") or resume.get("email", ""),
            "phone": fields.get("phone") or resume.get("phone", ""),
            "location": fields.get("location") or resume.get("location", ""),
            "linkedin": fields.get("linkedin", ""),
        },
        professional_links={
            "github": fields.get("github", ""),
            "portfolio": fields.get("portfolio", ""),
        },
        experience={
            "current_title": fields.get("current_title", ""),
            "current_company": fields.get("current_company", ""),
            "years_experience": fields.get("years_experience", ""),
            "salary_expectation": fields.get("salary_expectation", ""),
        },
        education={
            "degree": fields.get("degree", ""),
            "university": fields.get("university", ""),
            "graduation_year": fields.get("graduation_year", ""),
        },
        summary=fields.get("summary", ""),
        work_auth=fields.get("work_auth", "US Citizen"),
        willing_to_relocate=fields.get("willing_to_relocate", True),
        cover_letter=fields.get("cover_letter", ""),
        status="generated",
    )
