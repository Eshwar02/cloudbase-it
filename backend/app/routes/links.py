import secrets
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.models.tables import File, Folder, LinkShare, User
from app.schemas.sharing import LinkShareCreate, LinkShareOut
from app.services.permissions import require_role
from app.services.storage import get_storage

router = APIRouter(tags=["links"])


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


@router.post("/public-link", response_model=LinkShareOut, status_code=201)
def create_public_link(body: LinkShareCreate,
                       user: User = Depends(get_current_user),
                       session: Session = Depends(get_session)):
    obj, kind = _load_target(session, body.file_id, body.folder_id)
    require_role(session, user.id, minimum="owner", **{kind: obj})

    expires_at = None
    if body.expires_in_hours is not None:
        if body.expires_in_hours <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "expires_in_hours must be positive")
        expires_at = datetime.utcnow() + timedelta(hours=body.expires_in_hours)

    link = LinkShare(
        file_id=obj.id if kind == "file" else None,
        folder_id=obj.id if kind == "folder" else None,
        token=secrets.token_urlsafe(24), role=body.role,
        password_hash=hash_password(body.password) if body.password else None,
        expires_at=expires_at, created_by=user.id)
    session.add(link)
    session.commit()
    session.refresh(link)
    return LinkShareOut(
        id=link.id, token=link.token, url=f"/public/{link.token}",
        role=link.role, has_password=link.password_hash is not None,
        expires_at=link.expires_at, created_at=link.created_at)


@router.delete("/public-link/{link_id}", status_code=204)
def revoke_public_link(link_id: UUID, user: User = Depends(get_current_user),
                       session: Session = Depends(get_session)):
    link = session.get(LinkShare, link_id)
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    obj, kind = _load_target(session, link.file_id, link.folder_id)
    require_role(session, user.id, minimum="owner", **{kind: obj})
    session.delete(link)
    session.commit()


@router.get("/public/{token}")
def access_public_link(token: str, password: str | None = None,
                       session: Session = Depends(get_session)):
    link = session.exec(
        select(LinkShare).where(LinkShare.token == token)).first()
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    if link.expires_at is not None and datetime.utcnow() > link.expires_at:
        raise HTTPException(status.HTTP_410_GONE, "Link expired")
    if link.password_hash is not None:
        if not password or not verify_password(password, link.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                                "Password required or incorrect")

    if link.file_id is not None:
        f = session.get(File, link.file_id)
        if not f or f.is_trashed or f.status != "ready":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        return {"item_type": "file", "name": f.name, "role": link.role,
                "mime_type": f.mime_type, "size_bytes": f.size_bytes,
                "download_url": get_storage().signed_download_url(f.storage_key)}

    folder = session.get(Folder, link.folder_id)
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    subfolders = session.exec(select(Folder).where(
        Folder.parent_id == folder.id, Folder.is_trashed == False)).all()
    files = session.exec(select(File).where(
        File.folder_id == folder.id, File.is_trashed == False,
        File.status == "ready")).all()
    return {"item_type": "folder", "name": folder.name, "role": link.role,
            "folders": [{"id": s.id, "name": s.name} for s in subfolders],
            "files": [{"id": f.id, "name": f.name, "size_bytes": f.size_bytes,
                       "mime_type": f.mime_type} for f in files]}
