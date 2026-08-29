import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"folder-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_create_and_nest_folders(auth_client):
    r = auth_client.post("/folders", json={"name": "Docs"})
    assert r.status_code == 201
    parent = r.json()["id"]

    r = auth_client.post("/folders", json={"name": "Sub", "parent_id": parent})
    assert r.status_code == 201
    child = r.json()["id"]

    r = auth_client.get(f"/folders/{child}/breadcrumb")
    names = [n["name"] for n in r.json()]
    assert names == ["Docs", "Sub"]


def test_soft_delete_folder(auth_client):
    r = auth_client.post("/folders", json={"name": "Temp"})
    fid = r.json()["id"]
    assert auth_client.delete(f"/folders/{fid}").status_code == 204
    assert auth_client.get(f"/folders/{fid}").status_code == 404


def test_cannot_move_folder_into_descendant(client):
    """Moving A into B (where B is a child of A) must return 400."""
    email = f"folder-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})

    # Create A (top-level)
    r = client.post("/folders", json={"name": "A"})
    assert r.status_code == 201
    a_id = r.json()["id"]

    # Create B under A
    r = client.post("/folders", json={"name": "B", "parent_id": a_id})
    assert r.status_code == 201
    b_id = r.json()["id"]

    # Attempt to move A into B — cycle
    r = client.patch(f"/folders/{a_id}", json={"parent_id": b_id})
    assert r.status_code == 400


def test_patch_trashed_folder_404(client):
    """PATCH on a trashed folder must return 404."""
    email = f"folder-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})

    r = client.post("/folders", json={"name": "ToTrash"})
    assert r.status_code == 201
    fid = r.json()["id"]

    # Soft-delete it
    assert client.delete(f"/folders/{fid}").status_code == 204

    # Now PATCH should be 404
    r = client.patch(f"/folders/{fid}", json={"name": "Renamed"})
    assert r.status_code == 404


def test_cannot_move_folder_into_other_users_folder(client):
    """User A must not be able to PATCH their folder into User B's folder (IDOR)."""
    # Set up user A
    email_a = f"folder-a-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email_a, "password": "pw", "display_name": "A"})
    client.post("/auth/login", json={"email": email_a, "password": "pw"})

    r = client.post("/folders", json={"name": "FA"})
    assert r.status_code == 201
    fa_id = r.json()["id"]

    # Set up user B using a separate TestClient so cookies are independent
    from fastapi.testclient import TestClient
    from app.main import app as fastapi_app
    client_b = TestClient(fastapi_app)
    email_b = f"folder-b-{uuid.uuid4().hex[:8]}@example.com"
    client_b.post("/auth/register", json={
        "email": email_b, "password": "pw", "display_name": "B"})
    client_b.post("/auth/login", json={"email": email_b, "password": "pw"})

    r = client_b.post("/folders", json={"name": "FB"})
    assert r.status_code == 201
    fb_id = r.json()["id"]

    # User A tries to move FA into FB — must be denied
    r = client.patch(f"/folders/{fa_id}", json={"parent_id": fb_id})
    assert r.status_code == 404


def test_breadcrumb_excludes_trashed_ancestor(client):
    """Breadcrumb for a live child must NOT include IDs of trashed ancestors."""
    email = f"folder-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "F"})
    client.post("/auth/login", json={"email": email, "password": "pw"})

    # Create parent P
    r = client.post("/folders", json={"name": "P"})
    assert r.status_code == 201
    p_id = r.json()["id"]

    # Create child C under P
    r = client.post("/folders", json={"name": "C", "parent_id": p_id})
    assert r.status_code == 201
    c_id = r.json()["id"]

    # Trash P
    assert client.delete(f"/folders/{p_id}").status_code == 204

    # Breadcrumb for C — C is not trashed, so endpoint is reachable
    r = client.get(f"/folders/{c_id}/breadcrumb")
    assert r.status_code == 200
    ids_in_trail = [entry["id"] for entry in r.json()]
    assert p_id not in ids_in_trail
