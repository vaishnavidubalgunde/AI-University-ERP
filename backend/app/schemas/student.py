from typing import List, Optional
from pydantic import BaseModel


class CourseAttendanceSummary(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    faculty_name: Optional[str] = None
    attended_classes: int
    total_classes: int
    percentage: float
    is_shortage: bool
    classes_needed_for_75: int


class ScheduleItem(BaseModel):
    time_slot: str
    course_code: str
    course_title: str
    room_number: str
    faculty_name: Optional[str] = None
    status: str  # "completed", "ongoing", "upcoming"


class UpcomingExamItem(BaseModel):
    course_code: str
    course_title: str
    exam_name: str
    exam_date: str
    time_slot: str
    room_number: str
    days_left: int


class DashboardNoticeItem(BaseModel):
    id: int
    title: str
    content: str
    category: str
    priority: str
    published_by: str
    published_at: str
    is_pinned: bool


class AIInsightItem(BaseModel):
    category: str
    title: str
    message: str
    action_text: Optional[str] = None
    action_intent: Optional[str] = None


class StudentDashboardResponse(BaseModel):
    student_name: str
    student_id: str
    department: str
    semester: int
    cgpa: float
    gpa_trend: str
    total_credits_earned: int
    total_credits_required: int
    overall_attendance_pct: float
    attendance_shortages_count: int
    fee_balance_due: float
    hall_ticket_eligible: bool
    courses_attendance: List[CourseAttendanceSummary]
    today_schedule: List[ScheduleItem]
    upcoming_exams: List[UpcomingExamItem]
    recent_notices: List[DashboardNoticeItem]
    ai_insights: List[AIInsightItem]
