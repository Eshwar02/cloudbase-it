from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: UUID | None = None


class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: UUID | None = None


class FolderOut(BaseModel):
    id: UUID
    owner_id: UUID
    parent_id: UUID | None
    name: str
    is_trashed: bool
    created_at: datetime
