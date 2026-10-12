from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    exam_name = Column(String(100), nullable=False)  # e.g., "Mid-Semester Examination 2", "End-Semester Examination"
    exam_date = Column(String(50), nullable=False)  # e.g., "2026-03-06"
    time_slot = Column(String(50), nullable=False)  # e.g., "10:00 AM - 01:00 PM"
    room_number = Column(String(50), nullable=False)  # e.g., "Hall 402, Block A"
    max_marks = Column(Float, nullable=False, default=100.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="exam_schedules")


class HallTicket(Base):
    __tablename__ = "hall_tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False, default=6)
    academic_year = Column(String(20), nullable=False, default="2026-2027")
    is_eligible = Column(Boolean, default=True, nullable=False)
    ineligibility_reason = Column(String(500), nullable=True)  # e.g. "Attendance < 75% in CS602" or "Fee dues pending"
    qr_token = Column(String(255), unique=True, nullable=False)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
