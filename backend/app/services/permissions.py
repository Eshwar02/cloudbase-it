from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.tables import File, Folder, Share

_RANK = {"viewer": 1, "editor": 2, "owner": 3}


def effective_role(
    session: Session, user_id: UUID, *, file: File | None = None,
    folder: Folder | None = None,
) -> str | None:
    resource = file or folder
    if resource is None:
        return None
    if resource.owner_id == user_id:
        return "owner"
    stmt = select(Share).where(Share.grantee_user_id == user_id)
    if file is not None:
        stmt = stmt.where(Share.file_id == file.id)
    else:
        stmt = stmt.where(Share.folder_id == folder.id)
    share = session.exec(stmt).first()
    return share.role if share else None


def require_role(session: Session, user_id: UUID, *, file=None, folder=None,
                 minimum: str) -> str:
    role = effective_role(session, user_id, file=file, folder=folder)
    if role is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if _RANK[role] < _RANK[minimum]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permission")
    return role
