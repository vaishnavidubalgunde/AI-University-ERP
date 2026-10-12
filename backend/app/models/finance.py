import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from app.core.database import Base


class FeeCategory(str, enum.Enum):
    TUITION = "tuition"
    HOSTEL = "hostel"
    EXAMINATION = "examination"
    LIBRARY = "library"
    LABORATORY = "laboratory"


class FeeStatus(str, enum.Enum):
    PAID = "paid"
    PARTIAL = "partial"
    PENDING = "pending"
    OVERDUE = "overdue"


class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, default="2026-2027")
    semester = Column(Integer, nullable=False, default=6)
    category = Column(Enum(FeeCategory), default=FeeCategory.TUITION, nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    status = Column(Enum(FeeStatus), default=FeeStatus.PENDING, nullable=False)
    due_date = Column(String(50), nullable=True)  # e.g., "2026-03-31"
    receipt_number = Column(String(100), unique=True, nullable=True)  # e.g., "REC-2026-98124"
    payment_date = Column(DateTime(timezone=True), nullable=True)
    transaction_ref = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @property
    def balance_due(self) -> float:
        return max(0.0, self.total_amount - self.paid_amount)
