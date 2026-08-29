from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str
    storage_used_bytes: int = 0
    storage_quota_bytes: int = 5_368_709_120
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Folder(SQLModel, table=True):
    __tablename__ = "folders"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    parent_id: UUID | None = Field(default=None, foreign_key="folders.id")
    name: str
    is_trashed: bool = False
    trashed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class File(SQLModel, table=True):
    __tablename__ = "files"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    name: str
    storage_key: str
    mime_type: str | None = None
    size_bytes: int = 0
    status: str = "pending"
    current_version_id: UUID | None = None
    is_trashed: bool = False
    trashed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FileVersion(SQLModel, table=True):
    __tablename__ = "file_versions"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID = Field(foreign_key="files.id", index=True)
    storage_key: str
    size_bytes: int = 0
    mime_type: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Share(SQLModel, table=True):
    __tablename__ = "shares"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    grantee_user_id: UUID = Field(foreign_key="users.id", index=True)
    role: str
    created_by: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LinkShare(SQLModel, table=True):
    __tablename__ = "link_shares"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    token: str = Field(unique=True, index=True)
    role: str
    password_hash: str | None = None
    expires_at: datetime | None = None
    created_by: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Star(SQLModel, table=True):
    __tablename__ = "stars"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    file_id: UUID | None = Field(default=None, foreign_key="files.id")
    folder_id: UUID | None = Field(default=None, foreign_key="folders.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Activity(SQLModel, table=True):
    __tablename__ = "activities"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    actor_id: UUID = Field(foreign_key="users.id", index=True)
    target_type: str
    target_id: UUID
    action: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
