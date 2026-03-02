import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct,
    Filter, FieldCondition, MatchValue,
    SearchRequest as QSearchRequest,
)
from app.config import QDRANT_URL, QDRANT_API_KEY, JOBS_COLLECTION, RESUMES_COLLECTION, EMBEDDING_DIM


_client: Optional[QdrantClient] = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return _client


def init_collections():
    """Create Qdrant collections if they don't exist."""
    client = get_client()
    existing = {c.name for c in client.get_collections().collections}

    vector_params = VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE)

    if JOBS_COLLECTION not in existing:
        client.create_collection(JOBS_COLLECTION, vectors_config=vector_params)
        print(f"[Qdrant] Created collection: {JOBS_COLLECTION}")

    if RESUMES_COLLECTION not in existing:
        client.create_collection(RESUMES_COLLECTION, vectors_config=vector_params)
        print(f"[Qdrant] Created collection: {RESUMES_COLLECTION}")


# ─── Jobs ─────────────────────────────────────────────────────────────────────

def store_job(job_data: Dict[str, Any], vector: Optional[List[float]] = None) -> str:
    """Store a job in Qdrant. Returns the job ID."""
    client = get_client()
    job_id = job_data.get("id") or str(uuid.uuid4())
    job_data["id"] = job_id

    if vector is None:
        vector = [0.0] * EMBEDDING_DIM  # placeholder if no embedding provided

    client.upsert(
        collection_name=JOBS_COLLECTION,
        points=[PointStruct(id=job_id, vector=vector, payload=job_data)]
    )
    return job_id


def store_jobs_batch(jobs: List[Dict[str, Any]], vectors: Optional[List[List[float]]] = None) -> int:
    """Batch upsert jobs. Returns count stored."""
    client = get_client()
    points = []
    for i, job in enumerate(jobs):
        job_id = job.get("id") or str(uuid.uuid4())
        job["id"] = job_id
        vec = vectors[i] if vectors and i < len(vectors) else [0.0] * EMBEDDING_DIM
        points.append(PointStruct(id=job_id, vector=vec, payload=job))

    client.upsert(collection_name=JOBS_COLLECTION, points=points)
    return len(points)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    results = client.retrieve(collection_name=JOBS_COLLECTION, ids=[job_id], with_payload=True)
    if results:
        return results[0].payload
    return None


def get_all_jobs(limit: int = 100) -> List[Dict[str, Any]]:
    client = get_client()
    results, _ = client.scroll(
        collection_name=JOBS_COLLECTION,
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )
    return [r.payload for r in results]


def delete_job(job_id: str):
    client = get_client()
    client.delete(collection_name=JOBS_COLLECTION, points_selector=[job_id])


def search_jobs_by_vector(
    query_vector: List[float],
    limit: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Vector similarity search over jobs collection."""
    client = get_client()

    qdrant_filter = None
    if filters:
        conditions = []
        for key, val in filters.items():
            if val:
                conditions.append(FieldCondition(key=key, match=MatchValue(value=val)))
        if conditions:
            qdrant_filter = Filter(must=conditions)

    results = client.search(
        collection_name=JOBS_COLLECTION,
        query_vector=query_vector,
        limit=limit,
        query_filter=qdrant_filter,
        with_payload=True,
    )
    return [
        {**r.payload, "relevancy_score": r.score}
        for r in results
    ]


# ─── Resumes ──────────────────────────────────────────────────────────────────

def store_resume(resume_id: str, resume_data: Dict[str, Any], vector: Optional[List[float]] = None):
    client = get_client()
    if vector is None:
        vector = [0.0] * EMBEDDING_DIM

    client.upsert(
        collection_name=RESUMES_COLLECTION,
        points=[PointStruct(id=resume_id, vector=vector, payload=resume_data)]
    )


def get_resume(resume_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    results = client.retrieve(collection_name=RESUMES_COLLECTION, ids=[resume_id], with_payload=True)
    if results:
        return results[0].payload
    return None


def get_resume_vector(resume_id: str) -> Optional[List[float]]:
    client = get_client()
    results = client.retrieve(collection_name=RESUMES_COLLECTION, ids=[resume_id], with_vectors=True)
    if results and results[0].vector:
        return results[0].vector
    return None
