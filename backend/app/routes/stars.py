from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, Star, User
from app.schemas.stars import StarCreate, StarredItem
from app.services.permissions import require_role

router = APIRouter(prefix="/stars", tags=["stars"])


def _load_target(session: Session, file_id, folder_id):
    if file_id is not None:
        obj = session.get(File, file_id)
        if not obj or obj.is_trashed:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        return obj, "file"
    obj = session.get(Folder, folder_id)
    if not obj or obj.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    return obj, "folder"


@router.post("", status_code=201)
def add_star(body: StarCreate, user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    obj, kind = _load_target(session, body.file_id, body.folder_id)
    require_role(session, user.id, minimum="viewer", **{kind: obj})
    stmt = select(Star).where(Star.user_id == user.id)
    stmt = (stmt.where(Star.file_id == obj.id) if kind == "file"
            else stmt.where(Star.folder_id == obj.id))
    if session.exec(stmt).first():
        return {"status": "starred"}
    star = Star(user_id=user.id,
                file_id=obj.id if kind == "file" else None,
                folder_id=obj.id if kind == "folder" else None)
    session.add(star)
    session.commit()
    return {"status": "starred"}


@router.delete("", status_code=204)
def remove_star(file_id: UUID | None = None, folder_id: UUID | None = None,
                user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    if (file_id is None) == (folder_id is None):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Provide exactly one of file_id or folder_id")
    stmt = select(Star).where(Star.user_id == user.id)
    stmt = (stmt.where(Star.file_id == file_id) if file_id is not None
            else stmt.where(Star.folder_id == folder_id))
    star = session.exec(stmt).first()
    if star:
        session.delete(star)
        session.commit()


@router.get("", response_model=list[StarredItem])
def list_starred(user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)):
    stars = session.exec(select(Star).where(Star.user_id == user.id)).all()
    items: list[StarredItem] = []
    for s in stars:
        if s.folder_id is not None:
            f = session.get(Folder, s.folder_id)
            if f and not f.is_trashed:
                items.append(StarredItem(id=f.id, item_type="folder",
                                         name=f.name))
        elif s.file_id is not None:
            f = session.get(File, s.file_id)
            if f and not f.is_trashed and f.status == "ready":
                items.append(StarredItem(id=f.id, item_type="file", name=f.name,
                                         mime_type=f.mime_type,
                                         size_bytes=f.size_bytes))
    return items
