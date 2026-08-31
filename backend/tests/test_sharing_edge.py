"""Edge-case hardening for sharing, public links, and stars."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import storage as storage_module


def _new_client() -> tuple[TestClient, str]:
    c = TestClient(app)
    email = f"edge-{uuid.uuid4().hex[:8]}@example.com"
    c.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "E"})
    c.post("/auth/login", json={"email": email, "password": "pw"})
    return c, email


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


# --- shares ---------------------------------------------------------------

def test_cannot_share_with_self():
    owner, owner_email = _new_client()
    fid = owner.post("/folders", json={"name": "X"}).json()["id"]
    r = owner.post("/shares", json={
        "folder_id": fid, "grantee_email": owner_email, "role": "viewer"})
    assert r.status_code == 400


def test_share_rejects_invalid_role():
    owner, _ = _new_client()
    _, grantee_email = _new_client()
    fid = owner.post("/folders", json={"name": "X"}).json()["id"]
    r = owner.post("/shares", json={
        "folder_id": fid, "grantee_email": grantee_email, "role": "admin"})
    assert r.status_code == 422


def test_share_rejects_both_targets():
    owner, _ = _new_client()
    _, grantee_email = _new_client()
    fid = owner.post("/folders", json={"name": "X"}).json()["id"]
    r = owner.post("/shares", json={
        "file_id": str(uuid.uuid4()), "folder_id": fid,
        "grantee_email": grantee_email, "role": "viewer"})
    assert r.status_code == 422


def test_resharing_updates_role_not_duplicates():
    owner, _ = _new_client()
    grantee, grantee_email = _new_client()
    fid = owner.post("/folders", json={"name": "X"}).json()["id"]
    owner.post("/shares", json={
        "folder_id": fid, "grantee_email": grantee_email, "role": "viewer"})
    owner.post("/shares", json={
        "folder_id": fid, "grantee_email": grantee_email, "role": "editor"})
    grants = owner.get(f"/shares?folder_id={fid}").json()
    assert len(grants) == 1
    assert grants[0]["role"] == "editor"
    # editor can now create a subfolder
    assert grantee.post("/folders", json={
        "name": "sub", "parent_id": fid}).status_code == 201


# --- public links ---------------------------------------------------------

def test_revoke_public_link_blocks_access(auth_client_factory, fake_storage):
    owner = auth_client_factory()
    fid = owner.post("/files/init-upload", json={
        "name": "r.txt", "size_bytes": 5}).json()["file_id"]
    owner.post("/files/complete-upload", json={"file_id": fid})
    created = owner.post("/public-link", json={"file_id": fid}).json()
    token, link_id = created["token"], created["id"]

    anon = TestClient(app)
    assert anon.get(f"/public/{token}").status_code == 200
    assert owner.delete(f"/public-link/{link_id}").status_code == 204
    assert anon.get(f"/public/{token}").status_code == 404


def test_public_folder_link_lists_children(auth_client_factory, fake_storage):
    owner = auth_client_factory()
    fid = owner.post("/folders", json={"name": "Public"}).json()["id"]
    owner.post("/folders", json={"name": "child", "parent_id": fid})
    token = owner.post("/public-link", json={"folder_id": fid}).json()["token"]

    anon = TestClient(app)
    r = anon.get(f"/public/{token}")
    assert r.status_code == 200
    body = r.json()
    assert body["item_type"] == "folder"
    assert any(c["name"] == "child" for c in body["folders"])


# --- stars ----------------------------------------------------------------

def test_unstar_when_not_starred_is_noop():
    c, _ = _new_client()
    fid = c.post("/folders", json={"name": "X"}).json()["id"]
    assert c.delete(f"/stars?folder_id={fid}").status_code == 204


def test_star_rejects_both_targets():
    c, _ = _new_client()
    fid = c.post("/folders", json={"name": "X"}).json()["id"]
    r = c.post("/stars", json={"file_id": str(uuid.uuid4()), "folder_id": fid})
    assert r.status_code == 422


def test_star_missing_target_404():
    c, _ = _new_client()
    r = c.post("/stars", json={"folder_id": str(uuid.uuid4())})
    assert r.status_code == 404


@pytest.fixture
def auth_client_factory():
    def _make():
        c, _ = _new_client()
        return c
    return _make
