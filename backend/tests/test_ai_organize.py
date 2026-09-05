"""AI organize endpoints: 503 when disabled, propose + apply when enabled."""
import uuid

import pytest

from app.routes import ai as ai_route


@pytest.fixture
def auth_client(client):
    email = f"org-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "O"})
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


def _folder(auth_client, name, parent=None):
    r = auth_client.post("/folders", json={"name": name, "parent_id": parent})
    return r.json()["id"]


def _upload(auth_client, name, folder_id):
    r = auth_client.post("/files/init-upload", json={
        "name": name, "size_bytes": 5, "folder_id": folder_id})
    fid = r.json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    return fid


def test_organize_disabled_returns_503(auth_client, fake_storage):
    fid = _folder(auth_client, "Root")
    r = auth_client.post(f"/ai/organize/{fid}")
    assert r.status_code == 503
    assert r.json()["detail"] == "ai_unavailable"


def test_organize_propose(auth_client, fake_storage, monkeypatch):
    root = _folder(auth_client, "Root")
    f1 = _upload(auth_client, "invoice-jan.pdf", root)
    f2 = _upload(auth_client, "invoice-feb.pdf", root)
    monkeypatch.setattr(ai_route.ai, "ai_enabled", lambda: True)

    def fake_chat(system, user):
        return {"groups": [{"name": "Invoices",
                            "file_ids": [f1, f2], "folder_ids": []}]}
    monkeypatch.setattr(ai_route.ai, "chat_json", fake_chat)

    r = auth_client.post(f"/ai/organize/{root}")
    assert r.status_code == 200
    groups = r.json()["groups"]
    assert groups[0]["name"] == "Invoices"
    assert set(groups[0]["file_ids"]) == {f1, f2}


def test_organize_apply_moves_files(auth_client, fake_storage, monkeypatch):
    root = _folder(auth_client, "Root")
    f1 = _upload(auth_client, "invoice-jan.pdf", root)
    f2 = _upload(auth_client, "photo.jpg", root)
    monkeypatch.setattr(ai_route.ai, "ai_enabled", lambda: True)

    proposal = {"groups": [{"name": "Invoices",
                            "file_ids": [f1], "folder_ids": []}]}
    r = auth_client.post(f"/ai/organize/{root}/apply", json=proposal)
    assert r.status_code == 200
    body = r.json()
    assert body["moved"] == 1
    new_folder_id = body["created_folders"][0]["id"]

    # f1 now lives in the new subfolder; f2 stayed in root.
    listing = auth_client.get(f"/folders/{new_folder_id}").json()
    assert [f["id"] for f in listing["files"]] == [f1]
    root_listing = auth_client.get(f"/folders/{root}").json()
    assert f2 in [f["id"] for f in root_listing["files"]]


def test_organize_apply_ignores_unknown_ids(auth_client, fake_storage,
                                            monkeypatch):
    root = _folder(auth_client, "Root")
    monkeypatch.setattr(ai_route.ai, "ai_enabled", lambda: True)
    bogus = str(uuid.uuid4())
    proposal = {"groups": [{"name": "Ghosts",
                            "file_ids": [bogus], "folder_ids": []}]}
    r = auth_client.post(f"/ai/organize/{root}/apply", json=proposal)
    assert r.status_code == 200
    assert r.json()["moved"] == 0


def test_organize_requires_access(auth_client, fake_storage):
    stranger_folder = str(uuid.uuid4())
    r = auth_client.post(f"/ai/organize/{stranger_folder}")
    assert r.status_code == 404
