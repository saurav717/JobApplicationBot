import httpx
from typing import List
from app.config import HUGGINGFACE_API_KEY, EMBEDDING_MODEL


HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{EMBEDDING_MODEL}"


async def embed_text(text: str) -> List[float]:
    """Embed a single text string via HuggingFace Inference API."""
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {
        "inputs": text,
        "options": {"wait_for_model": True}
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(HF_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

    # HF feature-extraction returns a nested list for a single string
    if isinstance(result, list) and isinstance(result[0], list):
        return result[0]
    return result


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed multiple texts (sequentially to respect free-tier rate limits)."""
    embeddings = []
    for text in texts:
        emb = await embed_text(text)
        embeddings.append(emb)
    return embeddings


def embed_text_sync(text: str) -> List[float]:
    """Synchronous wrapper using httpx."""
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {
        "inputs": text,
        "options": {"wait_for_model": True}
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(HF_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

    if isinstance(result, list) and isinstance(result[0], list):
        return result[0]
    return result
