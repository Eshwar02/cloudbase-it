from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TrashItem(BaseModel):
    id: UUID
    item_type: str
    name: str
    trashed_at: datetime | None
