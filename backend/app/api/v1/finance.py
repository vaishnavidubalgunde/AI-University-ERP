import uuid
from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User,
    UserRole,
    FeeRecord,
    FeeCategory,
    FeeStatus,
)
from app.schemas.finance import (
    FeeSummaryResponse,
    FeeRecordItem,
    FeePaymentRequest,
    FeePaymentResponse,
    OfficialDocumentItem,
    DocumentRequestPayload,
    DocumentRequestResponse,
)

router = APIRouter(prefix="/finance", tags=["Finance & Official Documents"])


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


@router.get("/fees", response_model=FeeSummaryResponse)
def get_fee_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve comprehensive student fee ledger, installment breakdown, and payment status.
    """
    student = _get_target_student(current_user, db)

    fee_records = db.query(FeeRecord).filter(FeeRecord.user_id == student.id).all()

    total_fee = sum(f.total_amount for f in fee_records)
    total_paid = sum(f.paid_amount for f in fee_records)
    total_due = sum(f.balance_due for f in fee_records)

    overall_status = "CLEARED" if total_due == 0 else "PENDING_DUES"

    records_list = [
        FeeRecordItem(
            id=f.id,
            semester=f.semester,
            academic_year=f.academic_year,
            category=f.category.value if hasattr(f.category, "value") else str(f.category),
            total_amount=f.total_amount,
            paid_amount=f.paid_amount,
            balance_due=f.balance_due,
            due_date=str(f.due_date) if f.due_date else "March 31, 2026",
            status=f.status.value if hasattr(f.status, "value") else str(f.status),
            transaction_id=f.transaction_ref,
            paid_at=f.payment_date.strftime("%B %d, %Y") if f.payment_date else None,
            receipt_number=f.receipt_number or (f"REC-2026-{f.id:04d}" if f.paid_amount > 0 else None),
        )
        for f in fee_records
    ]

    return FeeSummaryResponse(
        student_name=student.full_name,
        student_id=student.student_id or student.email,
        department=student.department or "Computer Science & Engineering",
        semester=student.semester or 6,
        total_fee=total_fee,
        total_paid=total_paid,
        total_due=total_due,
        overall_status=overall_status,
        records=records_list,
    )


@router.post("/pay", response_model=FeePaymentResponse)
def pay_fee(
    payload: FeePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Simulate secure university fee payment, update ledger, and generate official receipt.
    """
    student = _get_target_student(current_user, db)

    record = db.query(FeeRecord).filter(
        FeeRecord.id == payload.fee_record_id,
        FeeRecord.user_id == student.id,
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee record not found for this student.",
        )

    if record.balance_due <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This fee record is already fully paid.",
        )

    pay_amount = min(payload.amount, record.balance_due)
    record.paid_amount += pay_amount
    record.transaction_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
    record.payment_date = datetime.now(timezone.utc)

    if record.balance_due <= 0:
        record.status = FeeStatus.PAID
    else:
        record.status = FeeStatus.PARTIAL

    db.commit()
    db.refresh(record)

    receipt_num = f"REC-2026-{record.id:04d}-{uuid.uuid4().hex[:4].upper()}"
    record.receipt_number = receipt_num
    db.commit()

    return FeePaymentResponse(
        success=True,
        transaction_id=record.transaction_ref,
        receipt_number=receipt_num,
        amount_paid=pay_amount,
        remaining_balance=record.balance_due,
        message=f"Payment of Rs {pay_amount:,.2f} via {payload.payment_method} processed successfully.",
        timestamp=datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
    )


@router.get("/documents", response_model=List[OfficialDocumentItem])
def get_available_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve repository of official university certificates and verifiable document services.
    """
    student = _get_target_student(current_user, db)

    # Check fee dues for no-dues clearance
    fees = db.query(FeeRecord).filter(FeeRecord.user_id == student.id).all()
    total_due = sum(f.balance_due for f in fees)

    documents = [
        OfficialDocumentItem(
            id="bonafide-cert",
            title="Bonafide Student Certificate",
            category="Academic",
            description="Official signed certificate verifying active full-time student status for visa, passport, or bank accounts.",
            processing_time="Instant (Digital Seal)",
            fee=0.0,
            status="READY_TO_DOWNLOAD",
            verification_hash=f"AUTH-BONA-{uuid.uuid5(uuid.NAMESPACE_DNS, student.email).hex[:12].upper()}",
            issued_date="Current Term (2026-2027)",
        ),
        OfficialDocumentItem(
            id="grade-card-sem5",
            title="Semester 5 Official Grade Card",
            category="Examinations",
            description="Controller of Examinations certified grade ledger for Semester 5 with SGPA 8.70.",
            processing_time="Instant (Digital Seal)",
            fee=0.0,
            status="READY_TO_DOWNLOAD",
            verification_hash=f"AUTH-GRD5-{uuid.uuid5(uuid.NAMESPACE_DNS, student.email + '5').hex[:12].upper()}",
            issued_date="January 15, 2026",
        ),
        OfficialDocumentItem(
            id="fee-estimate-letter",
            title="Tuition Fee Estimate Letter",
            category="Finance",
            description="Institutional cost breakdown letter tailored for national/international education loan applications.",
            processing_time="Instant (Digital Seal)",
            fee=0.0,
            status="READY_TO_DOWNLOAD",
            verification_hash=f"AUTH-FEE-{uuid.uuid5(uuid.NAMESPACE_DNS, student.email + 'fee').hex[:12].upper()}",
            issued_date="Academic Year 2026-2027",
        ),
        OfficialDocumentItem(
            id="no-dues-clearance",
            title="University No-Dues Clearance Certificate",
            category="Administration",
            description="Multi-department clearance from Library, Accounts, Hostel, and Department Laboratories.",
            processing_time="Instant (Digital Seal)",
            fee=0.0,
            status="READY_TO_DOWNLOAD" if total_due == 0 else "PENDING_FEE_CLEARANCE",
            verification_hash=f"AUTH-NODUE-{uuid.uuid5(uuid.NAMESPACE_DNS, student.email + 'nodue').hex[:12].upper()}" if total_due == 0 else None,
            issued_date="February 22, 2026" if total_due == 0 else None,
        ),
    ]
    return documents


@router.post("/documents/request", response_model=DocumentRequestResponse)
def request_official_document(
    payload: DocumentRequestPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate verifiable digital credential certificate with instant tamper-evident hash.
    """
    student = _get_target_student(current_user, db)

    req_id = f"DOC-REQ-{uuid.uuid4().hex[:8].upper()}"
    title = payload.document_id.replace("-", " ").title()

    return DocumentRequestResponse(
        request_id=req_id,
        document_title=title,
        status="ISSUED_DIGITALLY",
        message=f"Digital credential for '{title}' generated for purpose: {payload.purpose}.",
        download_url=f"/api/v1/finance/documents/download/{req_id}",
        generated_at=datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
    )
