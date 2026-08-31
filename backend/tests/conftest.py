import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.core.db import engine
from app.core.ratelimit import limiter
from app.main import app

# Tests share one client IP, so a live limiter would produce flaky 429s across
# the suite. Disable it globally; test_ratelimit re-enables a local instance to
# verify the mechanism itself.
limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
