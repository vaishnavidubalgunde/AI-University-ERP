from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User,
    UserRole,
    PlacementDrive,
    PlacementApplication,
    ApplicationStatus,
)
from app.schemas.placement import (
    PlacementDriveItem,
    PlacementApplicationItem,
    ApplyDriveRequest,
    ApplyDriveResponse,
)

router = APIRouter(prefix="/placements", tags=["Placements & Campus Hiring"])


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


@router.get("/drives", response_model=List[PlacementDriveItem])
def get_placement_drives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve active company placement recruitment drives with personalized student eligibility check.
    """
    student = _get_target_student(current_user, db)
    student_cgpa = student.cgpa or 8.42

    drives = db.query(PlacementDrive).filter(PlacementDrive.is_active == True).all()

    # Get student's existing applications
    applications = db.query(PlacementApplication).filter(
        PlacementApplication.user_id == student.id
    ).all()
    app_map = {a.drive_id: a for a in applications}

    result = []
    for d in drives:
        is_cgpa_ok = student_cgpa >= d.eligibility_min_cgpa
        is_eligible = is_cgpa_ok
        reason = None
        if not is_cgpa_ok:
            reason = f"CGPA {student_cgpa} is below minimum requirement of {d.eligibility_min_cgpa}."

        existing_app = app_map.get(d.id)
        has_applied = existing_app is not None
        app_status = existing_app.status.value if existing_app else None

        result.append(
            PlacementDriveItem(
                id=d.id,
                company_name=d.company_name,
                job_role=d.job_role,
                ctc_package=f"Rs {d.ctc_lpa} LPA",
                location=d.location or "Bengaluru / Hybrid",
                min_cgpa=d.eligibility_min_cgpa,
                max_backlogs=d.max_backlogs,
                eligible_departments=d.eligible_departments,
                deadline=d.application_deadline,
                selection_rounds="Online Assessment -> Technical Interview 1 & 2 -> HR Round",
                is_eligible=is_eligible,
                eligibility_reason=reason,
                has_applied=has_applied,
                application_status=app_status,
            )
        )
    return result


@router.post("/apply", response_model=ApplyDriveResponse)
def apply_to_drive(
    payload: ApplyDriveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Submit 1-click verified campus recruitment application.
    """
    student = _get_target_student(current_user, db)

    drive = db.query(PlacementDrive).filter(PlacementDrive.id == payload.drive_id).first()
    if not drive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Placement drive not found.",
        )

    # Check CGPA eligibility
    student_cgpa = student.cgpa or 8.42
    if student_cgpa < drive.eligibility_min_cgpa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ineligible: CGPA {student_cgpa} is below minimum requirement of {drive.eligibility_min_cgpa}.",
        )

    # Check if already applied
    existing = db.query(PlacementApplication).filter(
        PlacementApplication.user_id == student.id,
        PlacementApplication.drive_id == payload.drive_id,
    ).first()

    if existing:
        return ApplyDriveResponse(
            success=True,
            application_id=existing.id,
            message=f"You have already applied for {drive.company_name} ({drive.job_role}). Current status: {existing.status.value.upper()}.",
            status=existing.status.value,
        )

    new_app = PlacementApplication(
        user_id=student.id,
        drive_id=drive.id,
        status=ApplicationStatus.APPLIED,
        applied_at=datetime.now(timezone.utc),
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return ApplyDriveResponse(
        success=True,
        application_id=new_app.id,
        message=f"Application submitted successfully for {drive.company_name} ({drive.job_role})!",
        status=ApplicationStatus.APPLIED.value,
    )


@router.get("/my-applications", response_model=List[PlacementApplicationItem])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve candidate's active application track with interview stages and feedback.
    """
    student = _get_target_student(current_user, db)

    apps = db.query(PlacementApplication).filter(
        PlacementApplication.user_id == student.id
    ).all()

    result = []
    for a in apps:
        drive = a.drive
        result.append(
            PlacementApplicationItem(
                id=a.id,
                drive_id=a.drive_id,
                company_name=drive.company_name if drive else "Unknown Company",
                job_role=drive.job_role if drive else "Software Engineer",
                ctc_package=f"Rs {drive.ctc_lpa} LPA" if drive else "N/A",
                applied_date=a.applied_at.strftime("%B %d, %Y") if a.applied_at else "March 01, 2026",
                status=a.status.value if hasattr(a.status, "value") else str(a.status),
                interview_date=a.interview_date,
                round_name="Technical Screening Interview" if a.interview_date else None,
                remarks=a.feedback_notes,
            )
        )
    return result
