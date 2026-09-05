def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_db_ok(client):
    resp = client.get("/health/db")
    assert resp.status_code == 200
    assert resp.json() == {"db": "ok"}
