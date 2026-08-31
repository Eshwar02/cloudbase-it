"""Micro-benchmarks for the listing and search queries that back the two
hottest read endpoints (GET /drive and GET /search) over 500 files/folders."""
from sqlmodel import select

from app.models.tables import File, Folder


def _drive_listing(session, owner_id):
    folders = session.exec(select(Folder).where(
        Folder.owner_id == owner_id, Folder.parent_id == None,  # noqa: E711
        Folder.is_trashed == False)).all()
    files = session.exec(select(File).where(
        File.owner_id == owner_id, File.folder_id == None,  # noqa: E711
        File.is_trashed == False, File.status == "ready")).all()
    return len(folders) + len(files)


def _search(session, owner_id, pattern):
    folders = session.exec(select(Folder).where(
        Folder.owner_id == owner_id, Folder.is_trashed == False,
        Folder.name.ilike(pattern))).all()
    files = session.exec(select(File).where(
        File.owner_id == owner_id, File.is_trashed == False,
        File.status == "ready", File.name.ilike(pattern))).all()
    return len(folders) + len(files)


def test_bench_drive_listing(benchmark, session, seeded):
    count = benchmark(lambda: _drive_listing(session, seeded["owner_id"]))
    assert count == 1000  # 500 root folders + 500 root files


def test_bench_search_by_name(benchmark, session, seeded):
    count = benchmark(lambda: _search(session, seeded["owner_id"], "%file-1%"))
    assert count > 0
