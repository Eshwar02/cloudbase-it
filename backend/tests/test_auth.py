import uuid


def _email():
    return f"user-{uuid.uuid4().hex[:8]}@example.com"


def test_register_login_me_flow(client):
    email = _email()
    r = client.post("/auth/register", json={
        "email": email, "password": "hunter2", "display_name": "Test"})
    assert r.status_code == 201
    assert r.json()["email"] == email

    r = client.post("/auth/login", json={"email": email, "password": "hunter2"})
    assert r.status_code == 200
    assert client.cookies.get("access_token")

    r = client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_login_bad_password(client):
    email = _email()
    client.post("/auth/register", json={
        "email": email, "password": "hunter2", "display_name": "Test"})
    r = client.post("/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    client.cookies.clear()
    r = client.get("/auth/me")
    assert r.status_code == 401
