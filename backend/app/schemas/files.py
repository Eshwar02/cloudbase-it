from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class InitUploadIn(BaseModel):
    name: str
    folder_id: UUID | None = None
    mime_type: str | None = None
    size_bytes: int


class InitUploadOut(BaseModel):
    file_id: UUID
    upload_url: str
    storage_key: str


class CompleteUploadIn(BaseModel):
    file_id: UUID


class FileOut(BaseModel):
    id: UUID
    name: str
    folder_id: UUID | None
    mime_type: str | None
    size_bytes: int
    status: str
    created_at: datetime


class FileUpdate(BaseModel):
    name: str | None = None
    folder_id: UUID | None = None
