import uuid


def _email():
    return f"user-{uuid.uuid4().hex[:8]}@example.com"


def _register_login(client, password="hunter2"):
    email = _email()
    client.post("/auth/register", json={
        "email": email, "password": password, "display_name": "Test"})
    client.post("/auth/login", json={"email": email, "password": password})
    return email


def test_update_profile(client):
    _register_login(client)
    r = client.patch("/auth/me", json={"display_name": "New Name"})
    assert r.status_code == 200
    assert r.json()["display_name"] == "New Name"
    assert client.get("/auth/me").json()["display_name"] == "New Name"


def test_change_password_flow(client):
    email = _register_login(client, password="oldpass12")
    r = client.post("/auth/change-password", json={
        "current_password": "oldpass12", "new_password": "brandnew99"})
    assert r.status_code == 200
    # Old password rejected, new one works.
    client.cookies.clear()
    assert client.post("/auth/login", json={
        "email": email, "password": "oldpass12"}).status_code == 401
    assert client.post("/auth/login", json={
        "email": email, "password": "brandnew99"}).status_code == 200


def test_change_password_wrong_current(client):
    _register_login(client, password="oldpass12")
    r = client.post("/auth/change-password", json={
        "current_password": "nope", "new_password": "brandnew99"})
    assert r.status_code == 400
    assert r.json()["detail"] == "current_password_incorrect"


def test_settings_merge(client):
    _register_login(client)
    assert client.get("/auth/me").json()["settings"] == {}
    r = client.patch("/auth/settings", json={"appearance": "dark"})
    assert r.status_code == 200
    assert r.json()["settings"]["appearance"] == "dark"
    # Second patch shallow-merges, keeping earlier keys.
    r = client.patch("/auth/settings", json={"density": "compact"})
    body = r.json()["settings"]
    assert body["appearance"] == "dark"
    assert body["density"] == "compact"


def test_settings_rejects_bad_value(client):
    _register_login(client)
    r = client.patch("/auth/settings", json={"appearance": "neon"})
    assert r.status_code == 422
