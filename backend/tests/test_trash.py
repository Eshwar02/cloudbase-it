import uuid

import pytest

from app.services import storage as storage_module


class FakeStorage:
    def signed_upload_url(self, key): return "x"
    def signed_download_url(self, key, expires=3600): return "x"
    def object_exists(self, key): return True
    def delete_object(self, key): pass


@pytest.fixture
def auth_client(client, monkeypatch):
    fake = FakeStorage()
    from app.routes import files as files_route
    monkeypatch.setattr(files_route, "get_storage", lambda: fake)
    from app.routes import trash as trash_route
    monkeypatch.setattr(trash_route, "get_storage", lambda: fake)
    email = f"trash-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "T"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_trash_and_restore_folder(auth_client):
    fid = auth_client.post("/folders", json={"name": "X"}).json()["id"]
    auth_client.delete(f"/folders/{fid}")
    listed = auth_client.get("/trash").json()
    assert any(i["id"] == fid for i in listed)
    assert auth_client.post(f"/trash/folder/{fid}/restore").status_code == 200
    assert auth_client.get(f"/folders/{fid}").status_code == 200


def test_purge_file(auth_client):
    fid = auth_client.post("/files/init-upload", json={
        "name": "z.txt", "size_bytes": 1}).json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    auth_client.delete(f"/files/{fid}")
    assert auth_client.delete(f"/trash/file/{fid}").status_code == 204
    assert auth_client.get("/trash").json() == [] or all(
        i["id"] != fid for i in auth_client.get("/trash").json())


def test_cannot_purge_untrashed_file(auth_client):
    fid = auth_client.post("/files/init-upload", json={
        "name": "live.txt", "size_bytes": 10}).json()["file_id"]
    auth_client.post("/files/complete-upload", json={"file_id": fid})
    # File is ready (not trashed) — purge should be rejected
    assert auth_client.delete(f"/trash/file/{fid}").status_code == 404
    # File must still exist
    assert auth_client.get(f"/files/{fid}").status_code == 200


def test_cannot_restore_untrashed_folder(auth_client):
    fid = auth_client.post("/folders", json={"name": "live-folder"}).json()["id"]
    # Folder is live (not trashed) — restore should be rejected
    assert auth_client.post(f"/trash/folder/{fid}/restore").status_code == 404
