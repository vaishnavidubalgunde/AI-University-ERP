from typing import List, Optional
from pydantic import BaseModel


class CourseDetail(BaseModel):
    id: int
    code: str
    title: str
    department_name: str
    semester: int
    credits: int
    course_type: str
    syllabus_summary: Optional[str] = None
    faculty_name: Optional[str] = None
    is_enrolled: bool = True


class AttendanceDetail(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    faculty_name: Optional[str] = None
    total_classes: int
    attended_classes: int
    missed_classes: int
    percentage: float
    is_shortage: bool
    status: str  # "safe" (>=85%), "adequate" (75-84%), "shortage" (<75%)
    classes_needed_for_75: int
    max_classes_can_miss_for_75: int


class AssessmentMarkItem(BaseModel):
    id: int
    assessment_name: str
    max_marks: float
    obtained_marks: float
    percentage: float
    assessment_date: str


class CourseMarksSummary(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    credits: int
    assessments: List[AssessmentMarkItem]
    total_max_marks: float
    total_obtained_marks: float
    aggregate_percentage: float
    projected_grade: str


class SemesterTranscriptItem(BaseModel):
    semester: int
    academic_year: str
    sgpa: float
    credits_registered: int
    credits_earned: int
    courses: List[dict]


class AcademicTranscriptResponse(BaseModel):
    student_name: str
    student_id: str
    department: str
    cgpa: float
    total_credits_earned: int
    semesters: List[SemesterTranscriptItem]


class ElectiveCourseOption(BaseModel):
    id: int
    code: str
    title: str
    credits: int
    faculty_name: Optional[str] = None
    syllabus_summary: Optional[str] = None
    available_seats: int
    is_selected: bool = False


class ElectiveRegistrationRequest(BaseModel):
    course_id: int
