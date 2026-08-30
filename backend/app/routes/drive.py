from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User

router = APIRouter(prefix="/drive", tags=["drive"])


@router.get("")
def get_drive(user: User = Depends(get_current_user),
              session: Session = Depends(get_session)):
    folders = session.exec(
        select(Folder).where(Folder.owner_id == user.id,
                             Folder.parent_id == None,  # noqa: E711
                             Folder.is_trashed == False)).all()
    files = session.exec(
        select(File).where(File.owner_id == user.id,
                           File.folder_id == None,  # noqa: E711
                           File.is_trashed == False,
                           File.status == "ready")).all()
    return {
        "folders": [{"id": f.id, "owner_id": f.owner_id, "parent_id": f.parent_id,
                     "name": f.name, "is_trashed": f.is_trashed,
                     "created_at": f.created_at} for f in folders],
        "files": [{"id": f.id, "name": f.name, "size_bytes": f.size_bytes,
                   "mime_type": f.mime_type} for f in files],
    }
