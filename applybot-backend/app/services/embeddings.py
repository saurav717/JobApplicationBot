import httpx
from typing import List
from app.config import HUGGINGFACE_API_KEY, EMBEDDING_MODEL, HF_ROUTER_BASE

HF_API_URL = f"{HF_ROUTER_BASE}/{EMBEDDING_MODEL}"


def _unwrap(result) -> List[float]:
    """Normalise various response shapes HF may return."""
    if isinstance(result, list):
        # [[float, ...]] – single text wrapped in a list
        if result and isinstance(result[0], list):
            return result[0]
        # [float, ...] – already flat
        if result and isinstance(result[0], (int, float)):
            return result
    raise ValueError(f"Unexpected embedding response shape: {type(result)}")


async def embed_text(text: str) -> List[float]:
    """Embed a single text string via HuggingFace Router API."""
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {
        "inputs": text,
        "options": {"wait_for_model": True},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(HF_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

    return _unwrap(result)


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed multiple texts sequentially (respects free-tier rate limits)."""
    embeddings = []
    for text in texts:
        emb = await embed_text(text)
        embeddings.append(emb)
    return embeddings


def embed_text_sync(text: str) -> List[float]:
    """Synchronous wrapper for use in non-async contexts."""
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {
        "inputs": text,
        "options": {"wait_for_model": True},
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(HF_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

    return _unwrap(result)
