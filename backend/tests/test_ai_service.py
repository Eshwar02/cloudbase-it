"""Unit tests for the Mistral wrapper. No network — the HTTP layer is mocked."""
import pytest

from app.services import ai


class FakeSettings:
    def __init__(self, key):
        self.mistral_api_key = key
        self.mistral_base_url = "https://api.mistral.ai"
        self.mistral_embed_model = "mistral-embed"
        self.mistral_chat_model = "mistral-large-latest"


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(ai, "get_settings", lambda: FakeSettings("sk-test"))


@pytest.fixture
def disabled(monkeypatch):
    monkeypatch.setattr(ai, "get_settings", lambda: FakeSettings(None))


def test_disabled_when_no_key(disabled):
    assert ai.ai_enabled() is False
    with pytest.raises(ai.AIUnavailable):
        ai.embed(["hello"])
    with pytest.raises(ai.AIUnavailable):
        ai.chat_json("sys", "user")


def test_enabled_with_key(enabled):
    assert ai.ai_enabled() is True


def test_embed_returns_vectors(enabled, monkeypatch):
    def fake_request(path, payload):
        assert path == "/v1/embeddings"
        assert payload["model"] == "mistral-embed"
        return {"data": [{"embedding": [0.1, 0.2, 0.3]},
                         {"embedding": [0.4, 0.5, 0.6]}]}
    monkeypatch.setattr(ai, "_request", fake_request)
    vecs = ai.embed(["a", "b"])
    assert vecs == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]


def test_chat_json_parses_object(enabled, monkeypatch):
    def fake_request(path, payload):
        assert path == "/v1/chat/completions"
        assert payload["response_format"] == {"type": "json_object"}
        return {"choices": [{"message": {"content": '{"groups": []}'}}]}
    monkeypatch.setattr(ai, "_request", fake_request)
    assert ai.chat_json("sys", "user") == {"groups": []}


def test_chat_json_malformed_raises(enabled, monkeypatch):
    monkeypatch.setattr(ai, "_request", lambda p, b: {
        "choices": [{"message": {"content": "not json"}}]})
    with pytest.raises(ai.AIError):
        ai.chat_json("sys", "user")
