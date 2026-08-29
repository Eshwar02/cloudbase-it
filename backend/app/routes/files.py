from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import Activity, File, FileVersion, Folder, User
from app.schemas.files import (
    CompleteUploadIn, FileOut, FileUpdate, InitUploadIn, InitUploadOut,
)
from app.services.permissions import require_role
from app.services.storage import get_storage

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/init-upload", response_model=InitUploadOut)
def init_upload(body: InitUploadIn, user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    if user.storage_used_bytes + body.size_bytes > user.storage_quota_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            "Storage quota exceeded")
    file = File(owner_id=user.id, folder_id=body.folder_id, name=body.name,
                mime_type=body.mime_type, size_bytes=body.size_bytes,
                status="pending", storage_key="")
    file.storage_key = f"{user.id}/{file.id}/{body.name}"
    session.add(file)
    session.commit()
    session.refresh(file)
    try:
        url = get_storage().signed_upload_url(file.storage_key)
    except Exception:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Storage unavailable")
    return InitUploadOut(file_id=file.id, upload_url=url,
                         storage_key=file.storage_key)


@router.post("/complete-upload", response_model=FileOut)
def complete_upload(body: CompleteUploadIn,
                    user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    file = session.get(File, body.file_id)
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="owner")
    if file.status == "ready":
        return file
    if not get_storage().object_exists(file.storage_key):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Object not uploaded")
    version = FileVersion(file_id=file.id, storage_key=file.storage_key,
                          size_bytes=file.size_bytes, mime_type=file.mime_type)
    session.add(version)
    session.commit()
    session.refresh(version)
    file.status = "ready"
    file.current_version_id = version.id
    file.updated_at = datetime.utcnow()
    db_user = session.get(User, user.id)
    db_user.storage_used_bytes += file.size_bytes
    session.add_all([file, db_user,
                     Activity(actor_id=user.id, target_type="file",
                              target_id=file.id, action="upload")])
    session.commit()
    session.refresh(file)
    return file


@router.get("/{file_id}", response_model=FileOut)
def get_file(file_id: UUID, user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="viewer")
    return file


@router.patch("/{file_id}", response_model=FileOut)
def update_file(file_id: UUID, body: FileUpdate,
                user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="editor")
    if body.name is not None:
        file.name = body.name
    if body.folder_id is not None:
        dest = session.get(Folder, body.folder_id)
        if dest is None or dest.is_trashed:
            raise HTTPException(status.HTTP_404_NOT_FOUND,
                                "Destination folder not found")
        require_role(session, user.id, folder=dest, minimum="editor")
        file.folder_id = body.folder_id
    file.updated_at = datetime.utcnow()
    session.add(file)
    session.commit()
    session.refresh(file)
    return file


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: UUID, user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="owner")
    file.is_trashed = True
    file.trashed_at = datetime.utcnow()
    session.add(file)
    session.commit()


@router.get("/{file_id}/download")
def download(file_id: UUID, user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    file = session.get(File, file_id)
    if not file or file.is_trashed or file.status != "ready":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    require_role(session, user.id, file=file, minimum="viewer")
    return {"download_url": get_storage().signed_download_url(file.storage_key)}
