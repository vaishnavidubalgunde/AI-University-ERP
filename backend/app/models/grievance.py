import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from app.core.database import Base


class GrievanceCategory(str, enum.Enum):
    ACADEMIC = "academic"
    EXAMINATION = "examination"
    HOSTEL_MESS = "hostel_mess"
    INFRASTRUCTURE = "infrastructure"
    FINANCE = "finance"
    OTHER = "other"


class GrievanceStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "GRV-2026-0042"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(Enum(GrievanceCategory), default=GrievanceCategory.ACADEMIC, nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(GrievanceStatus), default=GrievanceStatus.SUBMITTED, nullable=False)
    assigned_to = Column(String(255), nullable=True)  # e.g., "Dean of Student Affairs"
    resolution_notes = Column(Text, nullable=True)
    attachment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
