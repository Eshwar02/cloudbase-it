"""Isolated in-memory SQLite fixtures for reproducible micro-benchmarks.

Benchmarks must not depend on the remote Supabase database or network latency,
so they run against a shared in-memory SQLite engine seeded with a small,
deterministic dataset.
"""
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models.tables import File, Folder, Share, User
from app.core.security import hash_password


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        "sqlite://", connect_args={"check_same_thread": False},
        poolclass=StaticPool)
    SQLModel.metadata.create_all(eng)
    return eng


@pytest.fixture(scope="session")
def seeded(engine):
    """Owner with 500 folders (one shared with a second user) + 500 files."""
    with Session(engine) as s:
        owner = User(email="owner@bench.local",
                     password_hash=hash_password("pw"), display_name="Owner")
        grantee = User(email="grantee@bench.local",
                       password_hash=hash_password("pw"), display_name="Grantee")
        s.add_all([owner, grantee])
        s.commit()
        s.refresh(owner)
        s.refresh(grantee)

        folders = [Folder(owner_id=owner.id, name=f"folder-{i}")
                   for i in range(500)]
        s.add_all(folders)
        s.commit()
        shared_folder = folders[0]
        s.refresh(shared_folder)
        s.add(Share(folder_id=shared_folder.id, grantee_user_id=grantee.id,
                    role="viewer", created_by=owner.id))
        files = [File(owner_id=owner.id, name=f"file-{i}.txt",
                      storage_key=f"k/{uuid4()}", status="ready",
                      size_bytes=100) for i in range(500)]
        s.add_all(files)
        s.commit()
        return {
            "owner_id": owner.id, "grantee_id": grantee.id,
            "shared_folder_id": shared_folder.id,
            "sample_file_id": files[0].id,
        }


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s
