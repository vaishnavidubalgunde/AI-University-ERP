from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.core.database import Base


class AdmissionsEnquiry(Base):
    __tablename__ = "admissions_enquiries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False, index=True)
    program = Column(String(100), nullable=False)  # e.g., MBA, MCA, BBA, BCA, B.Com
    previous_qualification = Column(String(150), nullable=True)
    percentage = Column(Float, nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    query_notes = Column(Text, nullable=True)
    status = Column(String(50), default="Pending Contact", nullable=False)  # Pending Contact, Contacted, Admitted

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<AdmissionsEnquiry(id={self.id}, name='{self.full_name}', program='{self.program}')>"
