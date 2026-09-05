import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.deps import get_current_user
from app.models.tables import File, Folder, User
from app.schemas.ai import OrganizeApplyResult, OrganizeProposal
from app.services import ai
from app.services.permissions import require_role

router = APIRouter(prefix="/ai", tags=["ai"])

_SYSTEM = (
    "You organize a folder's contents into a small number of logical groups. "
    "You are given a JSON list of items (each with id, name, type, mime). "
    "Return ONLY a JSON object of the form "
    '{"groups": [{"name": "Group Name", "file_ids": [...], "folder_ids": [...]}]}. '
    "Use only ids from the input. Prefer 2-6 clear, human-friendly group names. "
    "Do not invent ids. Leave items ungrouped by omitting them."
)


def _load_folder(session: Session, folder_id: UUID, user: User,
                 minimum: str) -> Folder:
    folder = session.get(Folder, folder_id)
    if not folder or folder.is_trashed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    require_role(session, user.id, folder=folder, minimum=minimum)
    return folder


def _children(session: Session, folder_id: UUID):
    folders = session.exec(select(Folder).where(
        Folder.parent_id == folder_id, Folder.is_trashed == False)).all()
    files = session.exec(select(File).where(
        File.folder_id == folder_id, File.is_trashed == False,
        File.status == "ready")).all()
    return folders, files


@router.post("/organize/{folder_id}", response_model=OrganizeProposal)
def propose_organization(folder_id: UUID,
                         user: User = Depends(get_current_user),
                         session: Session = Depends(get_session)):
    _load_folder(session, folder_id, user, "viewer")
    if not ai.ai_enabled():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "ai_unavailable")
    folders, files = _children(session, folder_id)
    items = [{"id": str(f.id), "name": f.name, "type": "folder", "mime": None}
             for f in folders]
    items += [{"id": str(f.id), "name": f.name, "type": "file",
               "mime": f.mime_type} for f in files]
    try:
        raw = ai.chat_json(_SYSTEM, json.dumps(items))
        return OrganizeProposal.model_validate(raw)
    except (ai.AIError, ai.AIUnavailable):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "ai_error")


@router.post("/organize/{folder_id}/apply", response_model=OrganizeApplyResult)
def apply_organization(folder_id: UUID, proposal: OrganizeProposal,
                       user: User = Depends(get_current_user),
                       session: Session = Depends(get_session)):
    _load_folder(session, folder_id, user, "editor")
    created: list[dict] = []
    moved = 0
    for group in proposal.groups:
        if not group.file_ids and not group.folder_ids:
            continue
        subfolder = Folder(owner_id=user.id, parent_id=folder_id,
                           name=group.name)
        session.add(subfolder)
        session.commit()
        session.refresh(subfolder)
        created.append({"id": str(subfolder.id), "name": subfolder.name})
        for fid in group.file_ids:
            f = session.get(File, fid)
            if (f and not f.is_trashed and f.owner_id == user.id
                    and f.folder_id == folder_id):
                f.folder_id = subfolder.id
                f.updated_at = datetime.utcnow()
                session.add(f)
                moved += 1
        for sub_id in group.folder_ids:
            sf = session.get(Folder, sub_id)
            if (sf and not sf.is_trashed and sf.owner_id == user.id
                    and sf.parent_id == folder_id and sf.id != subfolder.id):
                sf.parent_id = subfolder.id
                sf.updated_at = datetime.utcnow()
                session.add(sf)
                moved += 1
        session.commit()
    return OrganizeApplyResult(created_folders=created, moved=moved)
