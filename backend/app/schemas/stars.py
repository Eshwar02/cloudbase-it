from uuid import UUID

from pydantic import BaseModel, model_validator


class StarCreate(BaseModel):
    file_id: UUID | None = None
    folder_id: UUID | None = None

    @model_validator(mode="after")
    def _one_target(self):
        if (self.file_id is None) == (self.folder_id is None):
            raise ValueError("Provide exactly one of file_id or folder_id")
        return self


class StarredItem(BaseModel):
    id: UUID
    item_type: str  # "file" | "folder"
    name: str
    mime_type: str | None = None
    size_bytes: int | None = None
