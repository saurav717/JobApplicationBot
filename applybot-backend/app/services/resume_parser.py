import io
import re
from pypdf import PdfReader
from typing import Dict, Any


def parse_resume_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse a PDF resume and extract structured data using a Groq LLM.
    Falls back to regex heuristics if the LLM call fails.
    Returns a dict with name, email, phone, location, summary, skills, experience, education, raw_text.
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    raw_text = ""
    for page in reader.pages:
        raw_text += page.extract_text() or ""

    try:
        from app.services.llm import parse_resume_with_llm
        parsed = parse_resume_with_llm(raw_text)
        parsed["raw_text"] = raw_text
        return parsed
    except Exception as e:
        print(f"[Resume parser] LLM extraction failed ({e}), falling back to regex")
        return _regex_fallback(raw_text)


# ─── Regex fallback ────────────────────────────────────────────────────────────

def _regex_fallback(raw_text: str) -> Dict[str, Any]:
    return {
        "raw_text": raw_text,
        "name": _extract_name(raw_text),
        "email": _extract_email(raw_text),
        "phone": _extract_phone(raw_text),
        "location": _extract_location(raw_text),
        "summary": _extract_summary(raw_text),
        "skills": _extract_skills(raw_text),
        "experience": _extract_experience(raw_text),
        "education": _extract_education(raw_text),
    }


def _extract_email(text: str) -> str:
    match = re.search(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', text)
    return match.group(0) if match else ""


def _extract_phone(text: str) -> str:
    match = re.search(
        r'(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?)(\d{4})', text
    )
    return match.group(0).strip() if match else ""


def _extract_name(text: str) -> str:
    for line in text.strip().splitlines():
        line = line.strip()
        if line and len(line.split()) in (2, 3) and line.replace(" ", "").isalpha():
            return line
    return ""


def _extract_location(text: str) -> str:
    patterns = [
        r'([A-Z][a-z]+,\s*[A-Z]{2})',
        r'([A-Z][a-z]+,\s*[A-Z][a-z]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return ""


def _extract_summary(text: str) -> str:
    pattern = re.search(
        r'(?:summary|profile|about|objective)[:\s\n]+(.+?)(?:\n\n|\n[A-Z])',
        text, re.IGNORECASE | re.DOTALL
    )
    if pattern:
        return pattern.group(1).strip()[:500]
    return ""


COMMON_SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "React", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "scikit-learn",
    "NLP", "LLM", "RAG", "Data Science", "Spark", "Hadoop",
    "Git", "CI/CD", "REST", "GraphQL", "Microservices",
]


def _extract_skills(text: str) -> list:
    found = []
    text_lower = text.lower()
    for skill in COMMON_SKILLS:
        if skill.lower() in text_lower:
            found.append(skill)
    return found


def _extract_experience(text: str) -> list:
    section = _extract_section(text, ["experience", "work history", "employment"])
    if not section:
        return []
    entries = []
    current = []
    for line in section.splitlines():
        line = line.strip()
        if not line:
            if current:
                entries.append({"raw": " ".join(current)})
                current = []
        else:
            current.append(line)
    if current:
        entries.append({"raw": " ".join(current)})
    return entries[:5]


def _extract_education(text: str) -> list:
    section = _extract_section(text, ["education", "academic"])
    if not section:
        return []
    entries = []
    for line in section.splitlines():
        line = line.strip()
        if line:
            entries.append({"raw": line})
    return entries[:4]


def _extract_section(text: str, headers: list) -> str:
    pattern = '|'.join(headers)
    match = re.search(
        rf'(?:{pattern})[:\s\n]+(.+?)(?:\n(?:[A-Z]{{2,}}|\d)|\Z)',
        text, re.IGNORECASE | re.DOTALL
    )
    return match.group(1).strip() if match else ""
