from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(q: str = "", type: str = "all",
           user: User = Depends(get_current_user),
           session: Session = Depends(get_session)):
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
