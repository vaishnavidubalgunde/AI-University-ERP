from typing import List, Optional
from pydantic import BaseModel


class NoticeItem(BaseModel):
    id: int
    title: str
    content: str
    category: str
    priority: str
    publisher: str
    target_role: str
    created_at: str
    attachment_url: Optional[str] = None
    is_urgent: bool
    is_pinned: bool


class NoticeFilterResponse(BaseModel):
    total_count: int
    categories: List[str]
    notices: List[NoticeItem]
