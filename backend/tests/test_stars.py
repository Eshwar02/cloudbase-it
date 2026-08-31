import uuid

from fastapi.testclient import TestClient

from app.main import app


def _new_client() -> tuple[TestClient, str]:
    c = TestClient(app)
    email = f"star-{uuid.uuid4().hex[:8]}@example.com"
    c.post("/auth/register", json={
        "email": email, "password": "pw", "display_name": "S"})
    c.post("/auth/login", json={"email": email, "password": "pw"})
    return c, email


def test_star_and_list_and_unstar():
    c, _ = _new_client()
    folder_id = c.post("/folders", json={"name": "Fav"}).json()["id"]

    assert c.post("/stars", json={"folder_id": folder_id}).status_code == 201
    # idempotent
    assert c.post("/stars", json={"folder_id": folder_id}).status_code == 201

    starred = c.get("/stars").json()
    assert any(i["id"] == folder_id and i["item_type"] == "folder"
               for i in starred)

    assert c.delete(f"/stars?folder_id={folder_id}").status_code == 204
    assert not any(i["id"] == folder_id for i in c.get("/stars").json())


def test_cannot_star_others_folder():
    owner, _ = _new_client()
    intruder, _ = _new_client()
    folder_id = owner.post("/folders", json={"name": "Mine"}).json()["id"]
    assert intruder.post(
        "/stars", json={"folder_id": folder_id}).status_code == 404
