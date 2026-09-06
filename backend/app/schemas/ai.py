from uuid import UUID

from pydantic import BaseModel, Field


class OrganizeGroup(BaseModel):
    name: str
    file_ids: list[UUID] = Field(default_factory=list)
    folder_ids: list[UUID] = Field(default_factory=list)


class OrganizeProposal(BaseModel):
    groups: list[OrganizeGroup] = Field(default_factory=list)


class OrganizeApplyResult(BaseModel):
    created_folders: list[dict]
    moved: int


class HelpMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class HelpChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[HelpMessage] = Field(default_factory=list)


class HelpChatOut(BaseModel):
    reply: str
    source: str  # "ai" | "faq"
