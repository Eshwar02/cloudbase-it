import uuid

from fastapi.testclient import TestClient

from app.main import app


def _new_client() -> tuple[TestClient, str]:
    c = TestClient(app)
    email = f"share-{uuid.uuid4().hex[:8]}@example.com"
    c.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "S"})
    c.post("/auth/login", json={"email": email, "password": "pw"})
    return c, email


def test_share_folder_grants_grantee_access():
    owner, _ = _new_client()
    grantee, grantee_email = _new_client()

    r = owner.post("/folders", json={"name": "Shared"})
    folder_id = r.json()["id"]

    # Grantee cannot see it before sharing
    assert grantee.get(f"/folders/{folder_id}").status_code == 404

    r = owner.post("/shares", json={
        "folder_id": folder_id, "grantee_email": grantee_email,
        "role": "viewer"})
    assert r.status_code == 201, r.text

    # Now grantee can view
    assert grantee.get(f"/folders/{folder_id}").status_code == 200
    # Viewer cannot create subfolders (needs editor)
    assert grantee.post("/folders", json={
        "name": "sub", "parent_id": folder_id}).status_code == 403

    # It shows in shared-with-me
    r = grantee.get("/shares/shared-with-me")
    assert any(i["id"] == folder_id for i in r.json())


def test_only_owner_can_share():
    owner, _ = _new_client()
    grantee, grantee_email = _new_client()
    other, other_email = _new_client()

    folder_id = owner.post("/folders", json={"name": "X"}).json()["id"]
    owner.post("/shares", json={
        "folder_id": folder_id, "grantee_email": grantee_email,
        "role": "editor"})

    # grantee (editor, not owner) cannot re-share
    r = grantee.post("/shares", json={
        "folder_id": folder_id, "grantee_email": other_email,
        "role": "viewer"})
    assert r.status_code == 403


def test_share_unknown_email_404():
    owner, _ = _new_client()
    folder_id = owner.post("/folders", json={"name": "X"}).json()["id"]
    r = owner.post("/shares", json={
        "folder_id": folder_id, "grantee_email": "nobody@example.com",
        "role": "viewer"})
    assert r.status_code == 404


def test_revoke_share_removes_access():
    owner, _ = _new_client()
    grantee, grantee_email = _new_client()
    folder_id = owner.post("/folders", json={"name": "X"}).json()["id"]
    share_id = owner.post("/shares", json={
        "folder_id": folder_id, "grantee_email": grantee_email,
        "role": "viewer"}).json()["id"]

    assert grantee.get(f"/folders/{folder_id}").status_code == 200
    assert owner.delete(f"/shares/{share_id}").status_code == 204
    assert grantee.get(f"/folders/{folder_id}").status_code == 404
