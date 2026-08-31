"""Micro-benchmarks for the server-side permission checks that gate every
authorized request (owner fast-path and shared-grant lookup)."""
from app.models.tables import File, Folder
from app.services.permissions import effective_role


def test_bench_effective_role_owner(benchmark, session, seeded):
    folder = session.get(Folder, seeded["shared_folder_id"])
    result = benchmark(
        lambda: effective_role(session, seeded["owner_id"], folder=folder))
    assert result == "owner"


def test_bench_effective_role_shared(benchmark, session, seeded):
    folder = session.get(Folder, seeded["shared_folder_id"])
    result = benchmark(
        lambda: effective_role(session, seeded["grantee_id"], folder=folder))
    assert result == "viewer"


def test_bench_effective_role_denied(benchmark, session, seeded):
    file = session.get(File, seeded["sample_file_id"])
    result = benchmark(
        lambda: effective_role(session, seeded["grantee_id"], file=file))
    assert result is None
