from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    storage_used_bytes: int
    storage_quota_bytes: int
    settings: dict = Field(default_factory=dict)
    created_at: datetime | None = None


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class SettingsUpdate(BaseModel):
    """Partial settings patch; shallow-merged into the stored object."""
    appearance: str | None = Field(default=None, pattern="^(light|dark|system)$")
    density: str | None = Field(default=None, pattern="^(comfortable|compact)$")
    default_view: str | None = Field(default=None, pattern="^(list|grid)$")
    confirm_permanent_delete: bool | None = None
    notifications: bool | None = None
