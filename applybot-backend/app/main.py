from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import resumes, jobs, applications, scraper
from app.services.vector_store import init_collections
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting ApplyBot Backend...")
    try:
        init_collections()
        print("✅ Qdrant collections initialized")
    except Exception as e:
        print(f"⚠️  Qdrant init warning: {e}")

    # Start the hourly job scraper background task
    start_scheduler()

    yield

    stop_scheduler()
    print("👋 Shutting down ApplyBot...")


app = FastAPI(
    title="ApplyBot API",
    description="Agentic Job Application Backend — resume parsing, semantic job matching, and AI form filling",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["Scraper"])


@app.get("/", tags=["Health"])
def root():
    return {"service": "ApplyBot", "status": "running", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
