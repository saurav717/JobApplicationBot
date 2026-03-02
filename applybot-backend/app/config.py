import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Qdrant collection names
JOBS_COLLECTION = "jobs"
RESUMES_COLLECTION = "resumes"

# Embedding model (HuggingFace Router API – new endpoint)
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIM = 384
HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference/models"

# Groq LLM models
GROQ_MODEL = "llama3-8b-8192"           # reranking & form filling
GROQ_PARSE_MODEL = "llama-3.3-70b-versatile"  # resume parsing (higher accuracy)
