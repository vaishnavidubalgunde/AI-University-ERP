from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class AssignedCourseItem(BaseModel):
    id: int
    code: str
    name: str
    department: str
    credits: int
    semester: int
    total_students: int
    classes_conducted: int
    average_attendance: float


class StudentRosterItem(BaseModel):
    id: int
    user_id: int
    student_name: str
    student_id: str  # USN e.g. 1DT23CS238
    email: str
    department: str
    semester: int
    section: str
    total_classes: int
    attended_classes: int
    attendance_percentage: float
    cie1_score: Optional[float] = None
    cie2_score: Optional[float] = None
    cie3_score: Optional[float] = None
    assignment_score: Optional[float] = None
    final_cie: Optional[float] = None
    status: str  # Safe, Warning, Shortage


class BatchAttendanceRecord(BaseModel):
    user_id: int
    course_id: int
    status: str  # present, absent, excused


class BatchAttendanceRequest(BaseModel):
    course_id: int
    date: str  # YYYY-MM-DD
    records: List[BatchAttendanceRecord]


class BatchMarksRecord(BaseModel):
    user_id: int
    course_id: int
    cie1: Optional[float] = None
    cie2: Optional[float] = None
    cie3: Optional[float] = None
    assignment: Optional[float] = None


class BatchMarksRequest(BaseModel):
    course_id: int
    records: List[BatchMarksRecord]


class FacultyOverviewKPIs(BaseModel):
    assigned_students: int
    assigned_subjects: int
    classes_sections: int
    average_attendance: float
    students_below_threshold: int
    average_class_performance: float
    upcoming_classes_count: int
    upcoming_exams_count: int
    pending_grievances_count: int
    important_notices_count: int


class FacultyTimetableItem(BaseModel):
    id: int
    day: str
    time: str
    course_code: str
    course_title: str
    room: str
    section: str
    semester: int
    status: str  # Completed, Ongoing, Scheduled


class FacultyGrievanceItem(BaseModel):
    id: int
    ticket_number: str
    student_name: str
    student_id: str
    category: str
    subject: str
    description: str
    status: str
    created_at: str
    resolution_notes: Optional[str] = None


class GrievanceResolutionRequest(BaseModel):
    resolution_notes: str
    status: str = "resolved"  # in_progress, resolved, rejected


class StudentProfile360(BaseModel):
    user_id: int
    student_name: str
    student_id: str
    email: str
    department: str
    semester: int
    section: str
    cgpa: float
    phone: Optional[str] = None
    overall_attendance: float
    attendance_records: List[Dict[str, Any]]
    internal_marks: List[Dict[str, Any]]
    exam_schedules: List[Dict[str, Any]]
    hall_ticket_eligible: bool
    hall_ticket_reason: Optional[str] = None
    placement_status: Optional[str] = None
    ai_academic_insights: List[str]


class FacultyAnalyticsResponse(BaseModel):
    attendance_distribution: Dict[str, int]
    cie_distribution: Dict[str, int]
    performance_trends: List[Dict[str, Any]]
    top_performing_students: List[Dict[str, Any]]
    at_risk_students: List[Dict[str, Any]]
    department_subject_averages: List[Dict[str, Any]]


class FacultyDashboardResponse(BaseModel):
    faculty_name: str
    faculty_email: str
    department: str
    designation: str
    total_assigned_courses: int
    total_active_students: int
    kpis: FacultyOverviewKPIs
    assigned_courses: List[AssignedCourseItem]
    recent_classes: List[FacultyTimetableItem]
    upcoming_exams: List[Dict[str, Any]]
    recent_grievances: List[FacultyGrievanceItem]
    recent_notices: List[Dict[str, Any]]
