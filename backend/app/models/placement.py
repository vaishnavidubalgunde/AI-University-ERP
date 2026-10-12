import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    SELECTED = "selected"
    REJECTED = "rejected"


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(255), nullable=False)
    job_role = Column(String(255), nullable=False)  # e.g., "Software Development Engineer"
    ctc_lpa = Column(Float, nullable=False)  # e.g., 14.5 LPA
    eligibility_min_cgpa = Column(Float, nullable=False, default=7.0)
    eligible_departments = Column(String(255), nullable=False, default="CSE, ISE, ECE")
    max_backlogs = Column(Integer, nullable=False, default=0)
    drive_date = Column(String(50), nullable=False)  # e.g., "2026-04-10"
    application_deadline = Column(String(50), nullable=False)
    location = Column(String(255), nullable=True, default="Bengaluru / Hybrid")
    job_description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    applications = relationship("PlacementApplication", back_populates="drive", cascade="all, delete-orphan")


class PlacementApplication(Base):
    __tablename__ = "placement_applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    drive_id = Column(Integer, ForeignKey("placement_drives.id"), nullable=False, index=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False)
    applied_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    interview_date = Column(String(50), nullable=True)
    feedback_notes = Column(Text, nullable=True)

    drive = relationship("PlacementDrive", back_populates="applications")
