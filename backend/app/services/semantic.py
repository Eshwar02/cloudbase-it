"""pgvector helpers for semantic search.

All functions are Postgres-only and are guarded by :func:`is_postgres`; on other
engines (SQLite in tests) callers fall back to keyword search, so these are never
reached with an incompatible backend.
"""
from uuid import UUID

from sqlmodel import Session, text


def is_postgres(session: Session) -> bool:
    return session.get_bind().dialect.name == "postgresql"


def _to_literal(vec: list[float]) -> str:
    return "[" + ",".join(repr(float(x)) for x in vec) + "]"


def store_embedding(session: Session, file_id: UUID, vector: list[float],
                    summary: str | None = None) -> None:
    if not is_postgres(session):
        return
    session.execute(
        text("update files set embedding = :vec ::vector, ai_summary = :sum "
             "where id = :fid"),
        {"vec": _to_literal(vector), "sum": summary, "fid": str(file_id)},
    )
    session.commit()


def search(session: Session, owner_id: UUID, query_vec: list[float],
           limit: int = 20) -> list[dict]:
    rows = session.execute(
        text(
            "select id, name, mime_type from files "
            "where owner_id = :oid and is_trashed = false "
            "and status = 'ready' and embedding is not null "
            "order by embedding <=> :qvec ::vector limit :lim"
        ),
        {"oid": str(owner_id), "qvec": _to_literal(query_vec), "lim": limit},
    ).all()
    return [{"id": r[0], "name": r[1], "mime_type": r[2]} for r in rows]
