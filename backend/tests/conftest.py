import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.core.db import engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
