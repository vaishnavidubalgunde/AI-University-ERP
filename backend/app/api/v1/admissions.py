from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.core.database import get_db, Base, engine
from app.models.admissions import AdmissionsEnquiry
from app.models.user import User
from app.schemas.admissions import (
    AdmissionsEnquiryCreate,
    AdmissionsEnquiryResponse,
    PortalStatsResponse,
    ProgramInfo,
)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/admissions", tags=["Admissions & Public Portal"])


@router.post("/apply", response_model=AdmissionsEnquiryResponse, status_code=status.HTTP_201_CREATED)
def apply_admission_enquiry(
    enquiry_data: AdmissionsEnquiryCreate,
    db: Session = Depends(get_db),
) -> Any:
    """
    Submit an admission enquiry / candidate application for July 2026 Batch.
    Stores data in database and triggers admissions counselor queue.
    """
    enquiry = AdmissionsEnquiry(
        full_name=enquiry_data.full_name.strip(),
        email=enquiry_data.email.strip().lower(),
        phone=enquiry_data.phone.strip(),
        program=enquiry_data.program.strip().upper(),
        previous_qualification=enquiry_data.previous_qualification,
        percentage=enquiry_data.percentage,
        state=enquiry_data.state,
        city=enquiry_data.city,
        query_notes=enquiry_data.query_notes,
        status="Pending Counselor Callback",
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.get("/enquiries", response_model=List[AdmissionsEnquiryResponse])
def get_all_enquiries(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve list of submitted candidate admission applications.
    """
    return db.query(AdmissionsEnquiry).order_by(AdmissionsEnquiry.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/portal-info", response_model=PortalStatsResponse)
def get_portal_info(
    db: Session = Depends(get_db),
) -> Any:
    """
    Public metadata and live status for Sagar University Portal landing page.
    """
    enquiries_count = db.query(AdmissionsEnquiry).count()
    active_students = db.query(User).count()

    programs = [
        ProgramInfo(
            code="MBA",
            name="Master of Business Administration",
            duration="2 Years (4 Semesters)",
            eligibility="50% in Any Bachelor's Degree",
            batch="July 2026 Batch",
            mode="Online / Hybrid Interactive",
            fee_per_sem="₹ 45,000 / sem"
        ),
        ProgramInfo(
            code="MCA",
            name="Master of Computer Applications",
            duration="2 Years (4 Semesters)",
            eligibility="BCA / B.Sc Computer Science / B.Tech",
            batch="July 2026 Batch",
            mode="AI-Integrated Online",
            fee_per_sem="₹ 40,000 / sem"
        ),
        ProgramInfo(
            code="BBA",
            name="Bachelor of Business Administration",
            duration="3 Years (6 Semesters)",
            eligibility="10+2 / Pre-University Pass",
            batch="July 2026 Batch",
            mode="Interactive LMS",
            fee_per_sem="₹ 30,000 / sem"
        ),
        ProgramInfo(
            code="BCA",
            name="Bachelor of Computer Applications",
            duration="3 Years (6 Semesters)",
            eligibility="10+2 with Mathematics / Computer Studies",
            batch="July 2026 Batch",
            mode="Cloud & Hands-on Coding",
            fee_per_sem="₹ 32,000 / sem"
        ),
        ProgramInfo(
            code="B.Com",
            name="Bachelor of Commerce (Hons)",
            duration="3 Years (6 Semesters)",
            eligibility="10+2 Commerce / Science",
            batch="July 2026 Batch",
            mode="Online & Industry Certifications",
            fee_per_sem="₹ 28,000 / sem"
        ),
        ProgramInfo(
            code="B.Tech",
            name="Bachelor of Technology (Computer Science & AI)",
            duration="4 Years (8 Semesters)",
            eligibility="10+2 with Physics, Chemistry & Mathematics",
            batch="July 2026 Batch",
            mode="Interactive LMS & Labs",
            fee_per_sem="₹ 55,000 / sem"
        ),
    ]

    return PortalStatsResponse(
        university_name="SAGAR UNIVERSITY",
        portal_name="Sagar University Online ERP & UMS Portal",
        academic_batch="Admissions Open For July 2026 Batch",
        admissions_status="Open - Early Bird Merit Grants Available",
        accreditations=[
            "UGC Entitled",
            "NAAC A+ Graded",
            "7 Decades Legacy in Higher Education",
            "AICTE Approved Programs",
        ],
        programs_offered=programs,
        helpline_phone="+91 9880147004",
        helpline_email="admissions@dsuonline.com",
        official_website="www.dsuonline.com",
        maintenance_window="Everyday between 11:55 PM to 12:30 AM",
        total_enquiries_received=enquiries_count,
        active_students_count=active_students,
    )
