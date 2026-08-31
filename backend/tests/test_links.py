import uuid

import pytest

from app.services import storage as storage_module


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
    monkeypatch.setattr(storage_module, "get_storage", lambda: fake)
    from app.routes import files as files_route
    from app.routes import links as links_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    monkeypatch.setattr(links_route, "get_storage", lambda: fake)
    return fake


@pytest.fixture
def auth_client(client):
    email = f"link-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "L"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def _upload(auth_client, name="a.txt"):
    fid = auth_client.post("/files/init-upload", json={
        "name": name, "size_bytes": 10}).json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    return fid


def test_public_link_no_password(auth_client, fake_storage, client):
    fid = _upload(auth_client)
    r = auth_client.post("/public-link", json={"file_id": fid})
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    assert r.json()["has_password"] is False

    # Anonymous access (fresh client, no auth cookies)
    from fastapi.testclient import TestClient
    from app.main import app
    anon = TestClient(app)
    r = anon.get(f"/public/{token}")
    assert r.status_code == 200
    assert r.json()["item_type"] == "file"
    assert "download_url" in r.json()


def test_public_link_with_password(auth_client, fake_storage):
    fid = _upload(auth_client, "secret.txt")
    token = auth_client.post("/public-link", json={
        "file_id": fid, "password": "hunter2"}).json()["token"]

    from fastapi.testclient import TestClient
    from app.main import app
    anon = TestClient(app)
    assert anon.get(f"/public/{token}").status_code == 401
    assert anon.get(f"/public/{token}?password=wrong").status_code == 401
    assert anon.get(f"/public/{token}?password=hunter2").status_code == 200


def test_public_link_expired(auth_client, fake_storage):
    fid = _upload(auth_client, "old.txt")
    # negative/zero hours rejected
    assert auth_client.post("/public-link", json={
        "file_id": fid, "expires_in_hours": 0}).status_code == 400

    token = auth_client.post("/public-link", json={
        "file_id": fid, "expires_in_hours": 1}).json()["token"]

    # Force expiry in the DB
    from datetime import datetime, timedelta
    from sqlmodel import Session, select
    from app.core.db import engine
    from app.models.tables import LinkShare
    with Session(engine) as s:
        link = s.exec(select(LinkShare).where(LinkShare.token == token)).first()
        link.expires_at = datetime.utcnow() - timedelta(hours=1)
        s.add(link)
        s.commit()

    from fastapi.testclient import TestClient
    from app.main import app
    anon = TestClient(app)
    assert anon.get(f"/public/{token}").status_code == 410


def test_only_owner_creates_public_link(auth_client, fake_storage):
    fid = _upload(auth_client, "o.txt")
    from fastapi.testclient import TestClient
    from app.main import app
    intruder = TestClient(app)
    email = f"intr-{uuid.uuid4().hex[:8]}@example.com"
    intruder.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "I"})
    intruder.post("/auth/login", json={"email": email, "password": "pw"})
    assert intruder.post("/public-link", json={"file_id": fid}).status_code == 404
