import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct,
    Filter, FieldCondition, MatchValue,
)
from app.config import QDRANT_URL, QDRANT_API_KEY, JOBS_COLLECTION, RESUMES_COLLECTION, EMBEDDING_DIM


_client: Optional[QdrantClient] = None

# Namespace for deterministic UUIDs from arbitrary string IDs
_UUID_NS = uuid.UUID("12345678-1234-5678-1234-567812345678")


def _to_uuid(id_str: str) -> str:
    """Convert any string to a deterministic UUID v5 (Qdrant-safe point ID)."""
    try:
        # Already a valid UUID — use it as-is
        uuid.UUID(id_str)
        return id_str
    except ValueError:
        return str(uuid.uuid5(_UUID_NS, id_str))


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
    point_id = _to_uuid(job_id)

    if vector is None:
        vector = [0.0] * EMBEDDING_DIM

    client.upsert(
        collection_name=JOBS_COLLECTION,
        points=[PointStruct(id=point_id, vector=vector, payload=job_data)]
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
        point_id = _to_uuid(job_id)
        points.append(PointStruct(id=point_id, vector=vec, payload=job))

    client.upsert(collection_name=JOBS_COLLECTION, points=points)
    return len(points)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    point_id = _to_uuid(job_id)
    try:
        results = client.retrieve(collection_name=JOBS_COLLECTION, ids=[point_id], with_payload=True)
    except Exception:
        return None
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
    point_id = _to_uuid(job_id)
    client.delete(collection_name=JOBS_COLLECTION, points_selector=[point_id])


def search_jobs_by_vector(
    query_vector: List[float],
    limit: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Vector similarity search over jobs collection (qdrant-client 1.16+)."""
    client = get_client()

    qdrant_filter = None
    if filters:
        conditions = []
        for key, val in filters.items():
            if val:
                conditions.append(FieldCondition(key=key, match=MatchValue(value=val)))
        if conditions:
            qdrant_filter = Filter(must=conditions)

    response = client.query_points(
        collection_name=JOBS_COLLECTION,
        query=query_vector,
        limit=limit,
        query_filter=qdrant_filter,
        with_payload=True,
    )
    return [
        {**r.payload, "relevancy_score": r.score}
        for r in response.points
    ]


# ─── Resumes ──────────────────────────────────────────────────────────────────

def store_resume(resume_id: str, resume_data: Dict[str, Any], vector: Optional[List[float]] = None):
    client = get_client()
    if vector is None:
        vector = [0.0] * EMBEDDING_DIM
    point_id = _to_uuid(resume_id)
    resume_data["_original_id"] = resume_id
    client.upsert(
        collection_name=RESUMES_COLLECTION,
        points=[PointStruct(id=point_id, vector=vector, payload=resume_data)]
    )


def get_resume(resume_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    point_id = _to_uuid(resume_id)
    try:
        results = client.retrieve(collection_name=RESUMES_COLLECTION, ids=[point_id], with_payload=True)
    except Exception:
        return None
    if results:
        return results[0].payload
    return None


def get_resume_vector(resume_id: str) -> Optional[List[float]]:
    client = get_client()
    point_id = _to_uuid(resume_id)
    try:
        results = client.retrieve(collection_name=RESUMES_COLLECTION, ids=[point_id], with_vectors=True)
    except Exception:
        return None
    if results and results[0].vector:
        return results[0].vector
    return None
