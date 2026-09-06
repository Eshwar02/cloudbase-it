import uuid


def _auth(client):
    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email, "password": "hunter2", "display_name": "Test"})
    client.post("/auth/login", json={"email": email, "password": "hunter2"})


def test_help_chat_requires_auth(client):
    client.cookies.clear()
    r = client.post("/ai/help-chat", json={"message": "how do I upload?"})
    assert r.status_code == 401


def test_help_chat_faq_fallback(client):
    # AI disabled by the conftest fixture -> FAQ path.
    _auth(client)
    r = client.post("/ai/help-chat", json={"message": "How do I recover a deleted file?"})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "faq"
    assert "trash" in body["reply"].lower() or "restore" in body["reply"].lower()


def test_help_chat_unknown_question_still_answers(client):
    _auth(client)
    r = client.post("/ai/help-chat", json={"message": "asdfqwer zzz"})
    assert r.status_code == 200
    assert r.json()["reply"]


def test_help_chat_ai_path(client, monkeypatch):
    from app.services import ai
    monkeypatch.setattr(ai, "ai_enabled", lambda: True)
    monkeypatch.setattr(ai, "chat_text", lambda system, messages: "AI says hello")
    _auth(client)
    r = client.post("/ai/help-chat", json={"message": "hi"})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "ai"
    assert body["reply"] == "AI says hello"
