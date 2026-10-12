from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr


class AdminOverviewKPIs(BaseModel):
    total_students: int
    total_faculty: int
    total_courses: int
    total_departments: int
    campus_average_attendance: float
    total_placement_offers: int
    average_ctc_lpa: float
    highest_ctc_lpa: float
    placement_rate_pct: float
    open_grievances: int
    fee_collection_rate: float
    total_fees_collected: float
    total_fees_pending: float
    active_exams_count: int
    recent_notices_count: int
    last_synced_at: str


class AdminStatsResponse(BaseModel):
    total_students: int
    total_faculty: int
    total_courses: int
    total_departments: int
    campus_average_attendance: float
    total_placement_offers: int
    open_grievances: int
    fee_collection_rate: float
    department_distribution: List[Dict[str, Any]]
    kpis: Optional[AdminOverviewKPIs] = None


class StudentRegistryItem(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: str
    department: str
    semester: int
    section: Optional[str] = "A"
    cgpa: float
    attendance_pct: Optional[float] = 85.0
    is_active: bool
    created_at: str


class CreateStudentRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = "student123"
    student_id: str
    department: str
    semester: int = 1
    section: Optional[str] = "A"
    cgpa: float = 8.00


class CreateStudentResponse(BaseModel):
    success: bool
    student_id: str
    user_id: int
    message: str


class AttendanceAnalyticsResponse(BaseModel):
    campus_average: float
    department_attendance: List[Dict[str, Any]]
    semester_attendance: List[Dict[str, Any]]
    low_attendance_students: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]


class AcademicAnalyticsResponse(BaseModel):
    overall_average_marks: float
    overall_pass_rate: float
    department_performance: List[Dict[str, Any]]
    subject_performance: List[Dict[str, Any]]
    grade_distribution: Dict[str, int]
    at_risk_students: List[Dict[str, Any]]


class PlacementAnalyticsResponse(BaseModel):
    eligible_students_count: int
    total_offers: int
    placement_rate: float
    average_ctc: float
    highest_ctc: float
    application_funnel: Dict[str, int]
    department_placements: List[Dict[str, Any]]
    readiness_distribution: Dict[str, int]


class GrievanceAnalyticsResponse(BaseModel):
    total_grievances: int
    open_count: int
    in_progress_count: int
    resolved_count: int
    rejected_count: int
    category_breakdown: Dict[str, int]
    avg_resolution_days: float
    recent_grievances: List[Dict[str, Any]]


class FeeAnalyticsResponse(BaseModel):
    total_billed: float
    total_collected: float
    total_outstanding: float
    collection_rate: float
    category_breakdown: List[Dict[str, Any]]
    department_collections: List[Dict[str, Any]]


class RealtimeTelemetryResponse(BaseModel):
    timestamp: str
    active_students_online: int
    classes_in_session: int
    campus_attendance_today: float
    unresolved_grievances: int
    fee_transactions_today: int
    system_load_pct: float


class KnowledgeDocItem(BaseModel):
    id: str
    title: str
    category: str
    filename: str
    file_size: str
    uploaded_at: str
    chunk_count: int
    status: str  # "INDEXED", "PROCESSING", "PENDING"


class DocumentUploadRequest(BaseModel):
    title: str
    category: str
    content: str
    filename: str


class DocumentUploadResponse(BaseModel):
    success: bool
    doc_id: str
    title: str
    message: str
    chunks_created: int


class ReindexRAGResponse(BaseModel):
    success: bool
    message: str
    total_documents: int
    total_vectors_indexed: int
    timestamp: str
