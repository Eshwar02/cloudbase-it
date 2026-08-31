from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, Share, User
from app.schemas.sharing import ShareCreate, ShareOut, SharedItem
from app.services.permissions import require_role

router = APIRouter(prefix="/shares", tags=["shares"])


def _load_target(session: Session, body_file_id, body_folder_id):
    if body_file_id is not None:
        obj = session.get(File, body_file_id)
        if not obj or obj.is_trashed:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        return obj, "file"
    obj = session.get(Folder, body_folder_id)
    if not obj or obj.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    return obj, "folder"


@router.post("", response_model=ShareOut, status_code=201)
def create_share(body: ShareCreate, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)):
    obj, kind = _load_target(session, body.file_id, body.folder_id)
    # Only the owner may grant access.
    kwargs = {kind: obj}
    require_role(session, user.id, minimum="owner", **kwargs)

    grantee = session.exec(
        select(User).where(User.email == body.grantee_email)).first()
    if not grantee:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Grantee not found")
    if grantee.id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Cannot share with yourself")

    stmt = select(Share).where(Share.grantee_user_id == grantee.id)
    stmt = (stmt.where(Share.file_id == obj.id) if kind == "file"
            else stmt.where(Share.folder_id == obj.id))
    share = session.exec(stmt).first()
    if share:
        share.role = body.role  # update existing grant
    else:
        share = Share(
            file_id=obj.id if kind == "file" else None,
            folder_id=obj.id if kind == "folder" else None,
            grantee_user_id=grantee.id, role=body.role, created_by=user.id)
    session.add(share)
    session.commit()
    session.refresh(share)
    return ShareOut(id=share.id, file_id=share.file_id,
                    folder_id=share.folder_id,
                    grantee_user_id=grantee.id, grantee_email=grantee.email,
                    role=share.role, created_at=share.created_at)


@router.get("/shared-with-me", response_model=list[SharedItem])
def shared_with_me(user: User = Depends(get_current_user),
                   session: Session = Depends(get_session)):
    shares = session.exec(
        select(Share).where(Share.grantee_user_id == user.id)).all()
    items: list[SharedItem] = []
    for s in shares:
        if s.folder_id is not None:
            f = session.get(Folder, s.folder_id)
            if not f or f.is_trashed:
                continue
            owner = session.get(User, f.owner_id)
            items.append(SharedItem(id=f.id, item_type="folder", name=f.name,
                                    role=s.role, owner_email=owner.email))
        elif s.file_id is not None:
            f = session.get(File, s.file_id)
            if not f or f.is_trashed:
                continue
            owner = session.get(User, f.owner_id)
            items.append(SharedItem(id=f.id, item_type="file", name=f.name,
                                    role=s.role, owner_email=owner.email))
    return items


@router.get("", response_model=list[ShareOut])
def list_shares(file_id: UUID | None = None, folder_id: UUID | None = None,
                user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    if (file_id is None) == (folder_id is None):
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Provide exactly one of file_id or folder_id")
    obj, kind = _load_target(session, file_id, folder_id)
    require_role(session, user.id, minimum="owner", **{kind: obj})
    stmt = select(Share).where(
        Share.file_id == obj.id if kind == "file"
        else Share.folder_id == obj.id)
    out = []
    for s in session.exec(stmt).all():
        grantee = session.get(User, s.grantee_user_id)
        out.append(ShareOut(id=s.id, file_id=s.file_id, folder_id=s.folder_id,
                            grantee_user_id=s.grantee_user_id,
                            grantee_email=grantee.email if grantee else "",
                            role=s.role, created_at=s.created_at))
    return out


@router.delete("/{share_id}", status_code=204)
def revoke_share(share_id: UUID, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)):
    share = session.get(Share, share_id)
    if not share:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    obj, kind = _load_target(
        session, share.file_id, share.folder_id)
    require_role(session, user.id, minimum="owner", **{kind: obj})
    session.delete(share)
    session.commit()
