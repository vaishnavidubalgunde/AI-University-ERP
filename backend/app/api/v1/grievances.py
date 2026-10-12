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
    Grievance,
    GrievanceCategory,
    GrievanceStatus,
)
from app.schemas.grievance import (
    GrievanceItem,
    CreateGrievanceRequest,
    CreateGrievanceResponse,
)

router = APIRouter(prefix="/grievances", tags=["Student Grievance & Support"])


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


@router.get("", response_model=List[GrievanceItem])
def get_student_grievances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve all support and grievance tickets submitted by the authenticated student.
    """
    student = _get_target_student(current_user, db)

    grievances = db.query(Grievance).filter(
        Grievance.user_id == student.id
    ).order_by(Grievance.created_at.desc()).all()

    result = [
        GrievanceItem(
            id=g.id,
            ticket_number=g.ticket_number,
            subject=g.subject,
            description=g.description,
            category=g.category.value if hasattr(g.category, "value") else str(g.category),
            priority="normal",
            status=g.status.value if hasattr(g.status, "value") else str(g.status),
            submitted_at=g.created_at.strftime("%B %d, %Y") if g.created_at else "February 20, 2026",
            resolved_at=g.resolved_at.strftime("%B %d, %Y") if g.resolved_at else None,
            admin_response=g.resolution_notes,
        )
        for g in grievances
    ]
    return result


@router.post("", response_model=CreateGrievanceResponse)
def submit_grievance(
    payload: CreateGrievanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Submit a formal support ticket or grievance to the university administration.
    """
    student = _get_target_student(current_user, db)

    # Match category enum
    cat_enum = GrievanceCategory.OTHER
    for c in GrievanceCategory:
        if c.value.lower() == payload.category.lower():
            cat_enum = c
            break

    ticket_no = f"GRV-2026-{uuid.uuid4().hex[:6].upper()}"

    new_grievance = Grievance(
        ticket_number=ticket_no,
        user_id=student.id,
        category=cat_enum,
        subject=payload.subject,
        description=payload.description,
        status=GrievanceStatus.SUBMITTED,
        assigned_to="Student Grievance Cell",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_grievance)
    db.commit()
    db.refresh(new_grievance)

    return CreateGrievanceResponse(
        success=True,
        ticket_number=new_grievance.ticket_number,
        message=f"Ticket {ticket_no} submitted successfully. You will receive email and portal updates on resolution progress.",
        status=GrievanceStatus.SUBMITTED.value,
        created_at=new_grievance.created_at.strftime("%B %d, %Y %I:%M %p"),
    )
