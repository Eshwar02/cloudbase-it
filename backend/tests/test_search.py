import uuid

import pytest


@pytest.fixture
def auth_client(client):
    email = f"search-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "S"})
    client.post("/auth/login", json={"email": email, "password": "pw"})
    return client


def test_search_finds_folder_by_name(auth_client):
    auth_client.post("/folders", json={"name": "Invoices2024"})
    r = auth_client.get("/search", params={"q": "invoice", "type": "folder"})
    assert r.status_code == 200
    assert any("Invoices2024" == item["name"] for item in r.json())


def test_search_scoped_to_owner(auth_client, client):
    auth_client.post("/folders", json={"name": "SecretFolder"})
    # a second, fresh user
    email2 = f"other-{uuid.uuid4().hex[:8]}@example.com"
    client.cookies.clear()
    client.post("/auth/register", json={
        "email": email2, "password": "pw", "display_name": "O"})
    client.post("/auth/login", json={"email": email2, "password": "pw"})
    r = client.get("/search", params={"q": "Secret"})
    assert all(item["name"] != "SecretFolder" for item in r.json())
