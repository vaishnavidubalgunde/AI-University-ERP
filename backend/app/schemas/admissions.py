from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


class AdmissionsEnquiryCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    program: str  # e.g., MBA, MCA, BBA, BCA, B.Com
    previous_qualification: Optional[str] = None
    percentage: Optional[float] = None
    state: Optional[str] = None
    city: Optional[str] = None
    query_notes: Optional[str] = None


class AdmissionsEnquiryResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    program: str
    previous_qualification: Optional[str] = None
    percentage: Optional[float] = None
    state: Optional[str] = None
    city: Optional[str] = None
    query_notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgramInfo(BaseModel):
    code: str
    name: str
    duration: str
    eligibility: str
    batch: str
    mode: str
    fee_per_sem: str


class PortalStatsResponse(BaseModel):
    university_name: str
    portal_name: str
    academic_batch: str
    admissions_status: str
    accreditations: List[str]
    programs_offered: List[ProgramInfo]
    helpline_phone: str
    helpline_email: str
    official_website: str
    maintenance_window: str
    total_enquiries_received: int
    active_students_count: int


class OTPRequest(BaseModel):
    identifier: str  # Email or Mobile or USN
    role: Optional[str] = "student"


class OTPVerifyRequest(BaseModel):
    identifier: str
    otp_code: str


class PasswordResetRequest(BaseModel):
    identifier: str  # Email or USN or Mobile
