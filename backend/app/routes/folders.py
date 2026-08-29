from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.schemas.folders import FolderCreate, FolderOut, FolderUpdate
from app.services.permissions import require_role

router = APIRouter(prefix="/folders", tags=["folders"])


def _get_owned_folder(session: Session, folder_id: UUID, user: User) -> Folder:
    folder = session.get(Folder, folder_id)
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="viewer")
    return folder


@router.post("", response_model=FolderOut, status_code=201)
def create_folder(body: FolderCreate, user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    if body.parent_id:
        parent = session.get(Folder, body.parent_id)
        # C1 + I2: reject missing or trashed parent, then permission-check
        if not parent or parent.is_trashed:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent not found")
        require_role(session, user.id, folder=parent, minimum="editor")
    folder = Folder(owner_id=user.id, parent_id=body.parent_id, name=body.name)
    session.add(folder)
    session.commit()
    session.refresh(folder)
    return folder


@router.get("/{folder_id}")
def get_folder(folder_id: UUID, user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    folder = _get_owned_folder(session, folder_id, user)
    subfolders = session.exec(
        select(Folder).where(Folder.parent_id == folder_id,
                             Folder.is_trashed == False)).all()
    files = session.exec(
        select(File).where(File.folder_id == folder_id,
                           File.is_trashed == False,
                           File.status == "ready")).all()
    return {"folder": FolderOut.model_validate(folder, from_attributes=True),
            "folders": [FolderOut.model_validate(f, from_attributes=True)
                        for f in subfolders],
            "files": [{"id": f.id, "name": f.name, "size_bytes": f.size_bytes,
                       "mime_type": f.mime_type} for f in files]}


@router.get("/{folder_id}/breadcrumb")
def breadcrumb(folder_id: UUID, user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    _get_owned_folder(session, folder_id, user)
    trail = []
    current: UUID | None = folder_id
    while current is not None:
        f = session.get(Folder, current)
        if not f:
            break
        # C3: stop walking up when we hit a trashed ancestor
        if f.is_trashed:
            break
        trail.append({"id": f.id, "name": f.name})
        current = f.parent_id
    return list(reversed(trail))


@router.patch("/{folder_id}", response_model=FolderOut)
def update_folder(folder_id: UUID, body: FolderUpdate,
                  user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    # C2: also reject trashed folders
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="editor")
    if body.name is not None:
        folder.name = body.name
    if body.parent_id is not None:
        dest = session.get(Folder, body.parent_id)
        if dest is None or dest.is_trashed:
            raise HTTPException(status.HTTP_404_NOT_FOUND,
                                "Destination folder not found")
        require_role(session, user.id, folder=dest, minimum="editor")
        # I1: reject self-nest and descendant cycles
        if body.parent_id == folder_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Cannot move folder into itself or a descendant")
        # Walk up from proposed new parent; if we encounter folder_id, it's a cycle
        visited: set[UUID] = set()
        cursor: UUID | None = body.parent_id
        max_iters = 10000
        iters = 0
        while cursor is not None and iters < max_iters:
            if cursor == folder_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                    "Cannot move folder into itself or a descendant")
            if cursor in visited:
                # Cycle in existing data — stop gracefully
                break
            visited.add(cursor)
            ancestor = session.get(Folder, cursor)
            if not ancestor:
                break
            cursor = ancestor.parent_id
            iters += 1
        folder.parent_id = body.parent_id
    folder.updated_at = datetime.utcnow()
    session.add(folder)
    session.commit()
    session.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: UUID, user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    folder = session.get(Folder, folder_id)
    # I3: reject missing or already-trashed folder
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum="owner")
    folder.is_trashed = True
    folder.trashed_at = datetime.utcnow()
    session.add(folder)
    session.commit()
