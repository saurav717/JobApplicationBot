from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ─── Resume Models ──────────────────────────────────────────────────────────

class ResumeCreate(BaseModel):
    """Used when creating a resume from parsed PDF data."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    raw_text: Optional[str] = None


class Resume(ResumeCreate):
    id: str


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None


# ─── Job Models ──────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    type: Optional[str] = "Full-time"
    salary: Optional[str] = None
    department: Optional[str] = None
    posted: Optional[str] = None
    description: Optional[str] = None
    requirements: List[str] = []
    skills_required: List[str] = []
    logo_url: Optional[str] = None
    apply_url: Optional[str] = None


class Job(JobCreate):
    id: str


class JobWithScore(BaseModel):
    job: Job
    relevancy_score: float
    match_reasons: List[str] = []
    skill_matches: List[str] = []
    missing_skills: List[str] = []


# ─── Search Models ───────────────────────────────────────────────────────────

class SearchFilters(BaseModel):
    location: Optional[str] = None
    job_type: Optional[str] = None
    min_salary: Optional[int] = None
    department: Optional[str] = None


class SearchRequest(BaseModel):
    resume_id: str
    limit: int = 20
    filters: Optional[SearchFilters] = None
    use_llm_rerank: bool = False
    llm_provider: str = "groq"


class SearchResponse(BaseModel):
    jobs: List[JobWithScore]
    total: int
    resume_id: str


# ─── Application Form Models ──────────────────────────────────────────────────

class GenerateFormRequest(BaseModel):
    job_id: str
    resume_id: str
    custom_instructions: Optional[str] = None
    llm_provider: str = "groq"


class ApplicationFormField(BaseModel):
    label: str
    value: Optional[str] = None
    filled: bool = False


class ApplicationForm(BaseModel):
    job_id: str
    resume_id: str
    personal_info: Dict[str, Any] = {}
    professional_links: Dict[str, Any] = {}
    experience: Dict[str, Any] = {}
    education: Dict[str, Any] = {}
    summary: Optional[str] = None
    work_auth: Optional[str] = None
    willing_to_relocate: Optional[bool] = None
    cover_letter: Optional[str] = None
    status: str = "generated"
