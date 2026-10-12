from typing import List, Optional
from pydantic import BaseModel


class TimetableSlot(BaseModel):
    id: str
    time_slot: str
    course_code: str
    course_title: str
    room_number: str
    faculty_name: Optional[str] = None
    slot_type: str  # "lecture", "lab", "tutorial", "seminar"


class DayTimetable(BaseModel):
    day: str  # "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    slots: List[TimetableSlot]


class WeeklyTimetableResponse(BaseModel):
    academic_year: str
    semester: int
    department: str
    days: List[DayTimetable]


class ExamScheduleDetail(BaseModel):
    id: int
    course_code: str
    course_title: str
    exam_name: str
    exam_date: str
    time_slot: str
    reporting_time: str
    room_number: str
    seat_number: str
    max_marks: float
    days_left: int
    is_completed: bool


class CourseEligibilityItem(BaseModel):
    course_code: str
    course_title: str
    attendance_pct: float
    is_eligible: bool
    reason: Optional[str] = None


class ExamEligibilityResponse(BaseModel):
    student_name: str
    student_id: str
    semester: int
    overall_eligible: bool
    ineligibility_reasons: List[str]
    attendance_clearance: bool
    fee_clearance: bool
    disciplinary_clearance: bool
    fee_balance_due: float
    course_eligibilities: List[CourseEligibilityItem]


class HallTicketCourseItem(BaseModel):
    course_code: str
    course_title: str
    exam_date: str
    time_slot: str
    room_number: str
    seat_number: str


class HallTicketResponse(BaseModel):
    hall_ticket_number: str
    qr_token: str
    student_name: str
    student_id: str
    department: str
    semester: int
    academic_year: str
    is_eligible: bool
    ineligibility_reason: Optional[str] = None
    issued_date: str
    courses: List[HallTicketCourseItem]
    exam_center: str
    instructions: List[str]
