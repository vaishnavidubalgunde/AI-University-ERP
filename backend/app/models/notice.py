import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean
from app.core.database import Base


class NoticeCategory(str, enum.Enum):
    ACADEMIC = "academic"
    EXAMINATION = "examination"
    PLACEMENT = "placement"
    EVENTS = "events"
    GENERAL = "general"


class NoticePriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(Enum(NoticeCategory), default=NoticeCategory.GENERAL, nullable=False, index=True)
    priority = Column(Enum(NoticePriority), default=NoticePriority.NORMAL, nullable=False)
    published_by = Column(String(255), nullable=False, default="Registrar Office")
    target_department = Column(String(100), nullable=True)  # Nullable means all departments
    target_role = Column(String(50), nullable=True)  # Nullable means all roles
    is_pinned = Column(Boolean, default=False, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
