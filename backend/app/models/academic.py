import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class CourseType(str, enum.Enum):
    CORE = "core"
    ELECTIVE = "elective"
    LAB = "lab"
    PROJECT = "project"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "CSE"
    name = Column(String(255), nullable=False)  # e.g., "Computer Science & Engineering"
    building = Column(String(100), nullable=True)
    hod_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CS601"
    title = Column(String(255), nullable=False)  # e.g., "Distributed Cloud Systems"
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester = Column(Integer, nullable=False, default=1)
    credits = Column(Integer, nullable=False, default=4)
    course_type = Column(Enum(CourseType), default=CourseType.CORE, nullable=False)
    syllabus_summary = Column(String(1000), nullable=True)
    faculty_name = Column(String(255), nullable=True)

    department = relationship("Department", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="course", cascade="all, delete-orphan")
    internal_marks = relationship("InternalMark", back_populates="course", cascade="all, delete-orphan")
    exam_schedules = relationship("ExamSchedule", back_populates="course", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id", "academic_year", name="uq_user_course_year"),)

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, default="2026-2027")  # e.g., "2026-2027"
    semester = Column(Integer, nullable=False, default=6)
    grade = Column(String(5), nullable=True)  # e.g., "A+", "A", "B", "F"
    grade_points = Column(Float, nullable=True)  # e.g., 9.0
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="enrollments")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course_attendance"),)

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    total_classes = Column(Integer, nullable=False, default=0)
    attended_classes = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="attendance_records")

    @property
    def percentage(self) -> float:
        if self.total_classes == 0:
            return 100.0
        return round((self.attended_classes / self.total_classes) * 100, 1)

    @property
    def is_shortage(self) -> bool:
        return self.percentage < 75.0

    @property
    def classes_needed_for_75(self) -> int:
        if not self.is_shortage or self.total_classes == 0:
            return 0
        import math
        return max(1, math.ceil((0.75 * self.total_classes - self.attended_classes) / 0.25))

    @property
    def max_classes_can_miss_for_75(self) -> int:
        if self.is_shortage or self.total_classes == 0:
            return 0
        import math
        return max(0, math.floor((self.attended_classes / 0.75) - self.total_classes))


class InternalMark(Base):
    __tablename__ = "internal_marks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    assessment_name = Column(String(100), nullable=False)  # e.g., "IA-1", "IA-2", "Lab Exam", "Assignment"
    max_marks = Column(Float, nullable=False, default=50.0)
    obtained_marks = Column(Float, nullable=False, default=0.0)
    assessment_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="internal_marks")
