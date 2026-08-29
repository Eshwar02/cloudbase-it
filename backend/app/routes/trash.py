from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.schemas.trash import TrashItem
from app.services.storage import get_storage

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("", response_model=list[TrashItem])
def list_trash(user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    folders = session.exec(select(Folder).where(
        Folder.owner_id == user.id, Folder.is_trashed == True)).all()
    files = session.exec(select(File).where(
        File.owner_id == user.id, File.is_trashed == True)).all()
    items = [TrashItem(id=f.id, item_type="folder", name=f.name,
                       trashed_at=f.trashed_at) for f in folders]
    items += [TrashItem(id=f.id, item_type="file", name=f.name,
                        trashed_at=f.trashed_at) for f in files]
    return items


def _load_owned(session, user, item_type, item_id):
    if item_type not in ("file", "folder"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bad item type")
    model = Folder if item_type == "folder" else File
    obj = session.get(model, item_id)
    if not obj or obj.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if not obj.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return obj


@router.post("/{item_type}/{item_id}/restore", status_code=200)
def restore(item_type: str, item_id: UUID,
            user: User = Depends(get_current_user),
            session: Session = Depends(get_session)):
    obj = _load_owned(session, user, item_type, item_id)
    obj.is_trashed = False
    obj.trashed_at = None
    session.add(obj)
    session.commit()
    return {"status": "restored"}


@router.delete("/{item_type}/{item_id}", status_code=204)
def purge(item_type: str, item_id: UUID,
          user: User = Depends(get_current_user),
          session: Session = Depends(get_session)):
    obj = _load_owned(session, user, item_type, item_id)
    if item_type == "file" and obj.storage_key:
        try:
            get_storage().delete_object(obj.storage_key)
        except Exception:
            pass
        db_user = session.get(User, user.id)
        db_user.storage_used_bytes = max(0, db_user.storage_used_bytes
                                         - obj.size_bytes)
        session.add(db_user)
    session.delete(obj)
    session.commit()
