from typing import List, Optional
from pydantic import BaseModel


class PlacementDriveItem(BaseModel):
    id: int
    company_name: str
    job_role: str
    ctc_package: str
    location: str
    min_cgpa: float
    max_backlogs: int
    eligible_departments: str
    deadline: str
    selection_rounds: Optional[str] = None
    is_eligible: bool
    eligibility_reason: Optional[str] = None
    has_applied: bool
    application_status: Optional[str] = None


class PlacementApplicationItem(BaseModel):
    id: int
    drive_id: int
    company_name: str
    job_role: str
    ctc_package: str
    applied_date: str
    status: str  # "APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "OFFERED", "REJECTED"
    interview_date: Optional[str] = None
    round_name: Optional[str] = None
    remarks: Optional[str] = None


class ApplyDriveRequest(BaseModel):
    drive_id: int
    resume_url: Optional[str] = None


class ApplyDriveResponse(BaseModel):
    success: bool
    application_id: int
    message: str
    status: str
