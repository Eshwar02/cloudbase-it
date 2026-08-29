import uuid

import pytest

from app.services import storage as storage_module


class FakeStorage:
    def __init__(self):
        self.objects = set()

    def signed_upload_url(self, key):
        self.objects.add(key)  # simulate a client PUT succeeding
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
    # routes import the symbol directly, patch there too
    from app.routes import files as files_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    return fake


@pytest.fixture
def auth_client(client):
    email = f"file-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_upload_lifecycle(auth_client, fake_storage):
    r = auth_client.post("/files/init-upload", json={
        "name": "a.txt", "size_bytes": 10})
    assert r.status_code == 200
    fid = r.json()["file_id"]

    r = auth_client.post("/files/complete-upload", json={"file_id": fid})
    assert r.status_code == 200
    assert r.json()["status"] == "ready"

    r = auth_client.get(f"/files/{fid}/download")
    assert "download_url" in r.json()


def test_complete_upload_without_object_fails(auth_client, fake_storage):
    r = auth_client.post("/files/init-upload", json={
        "name": "b.txt", "size_bytes": 10})
    fid = r.json()["file_id"]
    fake_storage.objects.clear()  # simulate client never uploaded
    r = auth_client.post("/files/complete-upload", json={"file_id": fid})
    assert r.status_code == 400


def test_cannot_move_file_into_other_users_folder(client, fake_storage):
    """User A must not be able to PATCH their file into User B's folder (IDOR)."""
    # Set up user A and create + complete a file upload
    email_a = f"file-a-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email_a, "password": "pw", "display_name": "A"})
    client.post("/auth/login", json={"email": email_a, "password": "pw"})

    r = client.post("/files/init-upload", json={"name": "a.txt", "size_bytes": 10})
    assert r.status_code == 200
    a_file_id = r.json()["file_id"]

    r = client.post("/files/complete-upload", json={"file_id": a_file_id})
    assert r.status_code == 200

    # Set up user B using a separate TestClient so cookies are independent
    from fastapi.testclient import TestClient
    from app.main import app as fastapi_app
    client_b = TestClient(fastapi_app)
    email_b = f"file-b-{uuid.uuid4().hex[:8]}@example.com"
    client_b.post("/auth/register", json={
        "email": email_b, "password": "pw", "display_name": "B"})
    client_b.post("/auth/login", json={"email": email_b, "password": "pw"})

    r = client_b.post("/folders", json={"name": "B-Folder"})
    assert r.status_code == 201
    b_folder_id = r.json()["id"]

    # User A tries to move their file into B's folder — must be denied
    r = client.patch(f"/files/{a_file_id}", json={"folder_id": b_folder_id})
    assert r.status_code == 404

    # Confirm the file's folder_id was NOT changed
    r = client.get(f"/files/{a_file_id}")
    assert r.status_code == 200
    assert r.json()["folder_id"] != b_folder_id
