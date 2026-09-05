"""Semantic search route: keyword fallback (no key) and the AI-ranked branch."""
import uuid

import pytest

from app.routes import search as search_route
from app.services import ai as ai_module
from app.services import semantic as semantic_module


@pytest.fixture
def auth_client(client):
    email = f"sem-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "S"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


class FakeStorage:
    def __init__(self):
        self.objects = set()

    def signed_upload_url(self, key):
        self.objects.add(key)
        return f"https://storage.local/upload/{key}"

    def signed_download_url(self, key, expires=3600):
        return f"https://storage.local/download/{key}"

    def object_exists(self, key):
        return key in self.objects

    def delete_object(self, key):
        self.objects.discard(key)


@pytest.fixture
def fake_storage(monkeypatch):
    fake = FakeStorage()
    from app.routes import files as files_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    return fake


def _upload(auth_client, name):
    r = auth_client.post("/files/init-upload", json={"name": name,
                                                     "size_bytes": 5})
    fid = r.json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    return fid


def test_semantic_falls_back_to_keyword_when_disabled(auth_client, fake_storage):
    fid = _upload(auth_client, "quarterly-report.txt")
    _upload(auth_client, "vacation-photo.jpg")
    # No key configured in tests -> keyword fallback on the query string.
    r = auth_client.get("/search/semantic", params={"q": "quarterly"})
    assert r.status_code == 200
    ids = [row["id"] for row in r.json()]
    assert fid in ids
    assert len(ids) == 1


def test_semantic_uses_embeddings_when_enabled(auth_client, fake_storage,
                                               monkeypatch):
    fid = _upload(auth_client, "anything.txt")
    monkeypatch.setattr(search_route.ai, "ai_enabled", lambda: True)
    monkeypatch.setattr(search_route.semantic, "is_postgres", lambda s: True)
    monkeypatch.setattr(search_route.ai, "embed", lambda texts: [[0.1] * 1024])

    def fake_search(session, owner_id, qvec, limit):
        assert qvec == [0.1] * 1024
        return [{"id": fid, "name": "anything.txt", "mime_type": "text/plain"}]
    monkeypatch.setattr(search_route.semantic, "search", fake_search)

    r = auth_client.get("/search/semantic", params={"q": "meaning"})
    assert r.status_code == 200
    body = r.json()
    assert body[0]["id"] == fid
    assert body[0]["type"] == "file"


def test_semantic_falls_back_on_ai_error(auth_client, fake_storage, monkeypatch):
    fid = _upload(auth_client, "budget.txt")
    monkeypatch.setattr(search_route.ai, "ai_enabled", lambda: True)
    monkeypatch.setattr(search_route.semantic, "is_postgres", lambda s: True)

    def boom(texts):
        raise ai_module.AIError("provider down")
    monkeypatch.setattr(search_route.ai, "embed", boom)

    r = auth_client.get("/search/semantic", params={"q": "budget"})
    assert r.status_code == 200
    assert r.json()[0]["id"] == fid


def test_is_postgres_false_on_sqlite(client):
    # The shared test engine is SQLite; the helper must detect that.
    from app.core.db import engine
    from sqlmodel import Session
    with Session(engine) as s:
        assert semantic_module.is_postgres(s) is False
