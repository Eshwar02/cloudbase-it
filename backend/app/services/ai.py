"""Mistral wrapper for embeddings and JSON chat.

Optional by design: when ``MISTRAL_API_KEY`` is unset, ``ai_enabled()`` is False
and the callable helpers raise :class:`AIUnavailable`. Callers use that to fall
back (semantic search -> keyword) or to return a clean 503 (organize).
"""
import json

import httpx

from app.core.config import get_settings


class AIUnavailable(RuntimeError):
    """Raised when an AI call is attempted without a configured key."""


class AIError(RuntimeError):
    """Raised when the provider returns an unusable response."""


def ai_enabled() -> bool:
    return bool(get_settings().mistral_api_key)


def _request(path: str, payload: dict) -> dict:
    s = get_settings()
    resp = httpx.post(
        f"{s.mistral_base_url}{path}",
        headers={"Authorization": f"Bearer {s.mistral_api_key}",
                 "Content-Type": "application/json"},
        json=payload,
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def embed(texts: list[str]) -> list[list[float]]:
    if not ai_enabled():
        raise AIUnavailable("MISTRAL_API_KEY not configured")
    data = _request("/v1/embeddings", {
        "model": get_settings().mistral_embed_model,
        "input": texts,
    })
    return [item["embedding"] for item in data["data"]]


def chat_json(system: str, user: str) -> dict:
    if not ai_enabled():
        raise AIUnavailable("MISTRAL_API_KEY not configured")
    data = _request("/v1/chat/completions", {
        "model": get_settings().mistral_chat_model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    })
    try:
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise AIError(f"Malformed AI response: {exc}") from exc
