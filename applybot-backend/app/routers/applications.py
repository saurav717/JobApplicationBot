from fastapi import APIRouter, HTTPException
from app.models.schemas import ApplicationForm, GenerateFormRequest
from app.services.form_filler import generate_application_form

router = APIRouter()


@router.post("/generate", response_model=ApplicationForm)
async def generate_form(request: GenerateFormRequest):
    """Generate a pre-filled application form for a job + resume pair."""
    try:
        form = await generate_application_form(
            job_id=request.job_id,
            resume_id=request.resume_id,
            custom_instructions=request.custom_instructions,
        )
        return form
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to generate form: {str(e)}")
