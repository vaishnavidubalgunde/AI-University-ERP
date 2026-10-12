import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Float
from app.core.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)  # True for seeded, set to False for newly registered
    
    # Contextual metadata
    phone = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    program = Column(String(100), nullable=True)  # e.g., B.Tech, MCA, MBA
    student_id = Column(String(50), unique=True, index=True, nullable=True)  # e.g., 1DT23CS238
    semester = Column(Integer, default=1, nullable=True)
    section = Column(String(10), default="A", nullable=True)
    cgpa = Column(Float, default=8.42, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
