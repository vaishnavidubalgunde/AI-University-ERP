from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.system import NotificationCategory, NotificationPriority


class NotificationItem(BaseModel):
    id: int
    title: str
    message: str
    category: NotificationCategory
    priority: NotificationPriority
    is_read: bool
    action_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    unread_count: int
    total_count: int
    notifications: List[NotificationItem]


class CreateNotificationRequest(BaseModel):
    user_id: Optional[int] = None  # None for global broadcast
    title: str
    message: str
    category: NotificationCategory = NotificationCategory.SYSTEM
    priority: NotificationPriority = NotificationPriority.NORMAL
    action_url: Optional[str] = None
