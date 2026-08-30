import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"drive-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "pw", "display_name": "D"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_drive_lists_top_level_folder(auth_client):
    r = auth_client.post("/folders", json={"name": "TopLevel"})
    assert r.status_code == 201
    top_id = r.json()["id"]
    # a nested folder must NOT appear at drive root
    auth_client.post("/folders", json={"name": "Nested", "parent_id": top_id})

    r = auth_client.get("/drive")
    assert r.status_code == 200
    body = r.json()
    names = [f["name"] for f in body["folders"]]
    assert "TopLevel" in names
    assert "Nested" not in names


def test_drive_requires_auth(client):
    client.cookies.clear()
    assert client.get("/drive").status_code == 401
