from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, model_validator


class ShareCreate(BaseModel):
    file_id: UUID | None = None
    folder_id: UUID | None = None
    grantee_email: EmailStr
    role: str  # "viewer" | "editor"

    @model_validator(mode="after")
    def _one_target(self):
        if (self.file_id is None) == (self.folder_id is None):
            raise ValueError("Provide exactly one of file_id or folder_id")
        if self.role not in ("viewer", "editor"):
            raise ValueError("role must be viewer or editor")
        return self


class ShareOut(BaseModel):
    id: UUID
    file_id: UUID | None
    folder_id: UUID | None
    grantee_user_id: UUID
    grantee_email: str
    role: str
    created_at: datetime


class SharedItem(BaseModel):
    id: UUID
    item_type: str  # "file" | "folder"
    name: str
    role: str
    owner_email: str


class LinkShareCreate(BaseModel):
    file_id: UUID | None = None
    folder_id: UUID | None = None
    role: str = "viewer"
    password: str | None = None
    expires_in_hours: int | None = None

    @model_validator(mode="after")
    def _one_target(self):
        if (self.file_id is None) == (self.folder_id is None):
            raise ValueError("Provide exactly one of file_id or folder_id")
        if self.role not in ("viewer", "editor"):
            raise ValueError("role must be viewer or editor")
        return self


class LinkShareOut(BaseModel):
    id: UUID
    token: str
    url: str
    role: str
    has_password: bool
    expires_at: datetime | None
    created_at: datetime


class PublicResourceOut(BaseModel):
    item_type: str  # "file" | "folder"
    name: str
    role: str
    mime_type: str | None = None
    size_bytes: int | None = None
    download_url: str | None = None
