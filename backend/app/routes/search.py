from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.services import ai, semantic

router = APIRouter(prefix="/search", tags=["search"])


def _keyword_search(session: Session, user: User, q: str, type: str) -> list:
    pattern = f"%{q}%"
    results = []
    if type in ("all", "folder"):
        folders = session.exec(select(Folder).where(
            Folder.owner_id == user.id, Folder.is_trashed == False,
            Folder.name.ilike(pattern))).all()
        results += [{"id": f.id, "type": "folder", "name": f.name}
                    for f in folders]
    if type in ("all", "file"):
        files = session.exec(select(File).where(
            File.owner_id == user.id, File.is_trashed == False,
            File.status == "ready", File.name.ilike(pattern))).all()
        results += [{"id": f.id, "type": "file", "name": f.name,
                     "mime_type": f.mime_type} for f in files]
    return results


@router.get("")
def search(q: str = "", type: str = "all",
           user: User = Depends(get_current_user),
           session: Session = Depends(get_session)):
    return _keyword_search(session, user, q, type)


@router.get("/semantic")
def semantic_search(q: str = "",
                    user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    """Meaning-based file search. Falls back to keyword search when the AI key
    is unset, the backend isn't Postgres, or the provider errors."""
    if q and ai.ai_enabled() and semantic.is_postgres(session):
        try:
            qvec = ai.embed([q])[0]
            rows = semantic.search(session, user.id, qvec, limit=20)
            return [{"id": r["id"], "type": "file", "name": r["name"],
                     "mime_type": r["mime_type"]} for r in rows]
        except (ai.AIError, ai.AIUnavailable):
            pass
    return _keyword_search(session, user, q, "file")


@router.post("/backfill-embeddings")
def backfill_embeddings(user: User = Depends(get_current_user),
                        session: Session = Depends(get_session)):
    """Embed the caller's ready, not-yet-embedded files. No-op without a key."""
    if not (ai.ai_enabled() and semantic.is_postgres(session)):
        return {"embedded": 0, "ai_enabled": ai.ai_enabled()}
    files = session.exec(select(File).where(
        File.owner_id == user.id, File.is_trashed == False,
        File.status == "ready")).all()
    embedded = 0
    for f in files:
        blob = f"{f.name} {f.mime_type or ''}".strip()
        try:
            vec = ai.embed([blob])[0]
            semantic.store_embedding(session, f.id, vec)
            embedded += 1
        except (ai.AIError, ai.AIUnavailable):
            break
    return {"embedded": embedded, "ai_enabled": True}
