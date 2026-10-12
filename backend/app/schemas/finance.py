from typing import List, Optional
from pydantic import BaseModel


class FeeRecordItem(BaseModel):
    id: int
    semester: int
    academic_year: str
    category: str
    total_amount: float
    paid_amount: float
    balance_due: float
    due_date: str
    status: str
    transaction_id: Optional[str] = None
    paid_at: Optional[str] = None
    receipt_number: Optional[str] = None


class FeeSummaryResponse(BaseModel):
    student_name: str
    student_id: str
    department: str
    semester: int
    total_fee: float
    total_paid: float
    total_due: float
    overall_status: str  # "CLEARED", "PENDING_DUES", "OVERDUE"
    records: List[FeeRecordItem]


class FeePaymentRequest(BaseModel):
    fee_record_id: int
    amount: float
    payment_method: str  # "UPI", "Net Banking", "Debit Card", "Credit Card"


class FeePaymentResponse(BaseModel):
    success: bool
    transaction_id: str
    receipt_number: str
    amount_paid: float
    remaining_balance: float
    message: str
    timestamp: str


class OfficialDocumentItem(BaseModel):
    id: str
    title: str
    category: str
    description: str
    processing_time: str
    fee: float
    status: str  # "READY_TO_DOWNLOAD", "PROCESSING", "PENDING_FEE_CLEARANCE"
    verification_hash: Optional[str] = None
    issued_date: Optional[str] = None


class DocumentRequestPayload(BaseModel):
    document_id: str
    purpose: str


class DocumentRequestResponse(BaseModel):
    request_id: str
    document_title: str
    status: str
    message: str
    download_url: Optional[str] = None
    generated_at: str
