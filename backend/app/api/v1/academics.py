import math
from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User,
    UserRole,
    Department,
    Course,
    CourseType,
    Enrollment,
    Attendance,
    InternalMark,
)
from app.schemas.academic import (
    CourseDetail,
    AttendanceDetail,
    AssessmentMarkItem,
    CourseMarksSummary,
    AcademicTranscriptResponse,
    SemesterTranscriptItem,
    ElectiveCourseOption,
    ElectiveRegistrationRequest,
)

router = APIRouter(prefix="/academics", tags=["Academics"])


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context (allowing faculty/admin to preview)."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


@router.get("/courses", response_model=List[CourseDetail])
def get_student_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve all academic courses registered for the current student.
    """
    student = _get_target_student(current_user, db)
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student.id).all()
    enrolled_course_ids = {e.course_id for e in enrollments}

    courses = db.query(Course).all()
    result = []
    for c in courses:
        dept = c.department
        dept_name = dept.name if dept else "Engineering"
        result.append(
            CourseDetail(
                id=c.id,
                code=c.code,
                title=c.title,
                department_name=dept_name,
                semester=c.semester,
                credits=c.credits,
                course_type=c.course_type.value,
                syllabus_summary=c.syllabus_summary,
                faculty_name=c.faculty_name,
                is_enrolled=c.id in enrolled_course_ids,
            )
        )
    return result


@router.get("/attendance", response_model=List[AttendanceDetail])
def get_attendance_details(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve granular circular gauge attendance metrics, shortage projections, and permissible cuts.
    """
    student = _get_target_student(current_user, db)
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student.id).all()
    attendance_records = db.query(Attendance).filter(Attendance.user_id == student.id).all()
    attendance_map = {att.course_id: att for att in attendance_records}

    details = []
    for enr in enrollments:
        course = enr.course
        if not course:
            continue

        att = attendance_map.get(course.id)
        attended = att.attended_classes if att else 0
        total = att.total_classes if att else 0
        missed = max(0, total - attended)

        pct = round((attended / total * 100), 1) if total > 0 else 100.0
        is_short = pct < 75.0

        needed_for_75 = 0
        can_miss_for_75 = 0

        if is_short and total > 0:
            needed_for_75 = max(1, math.ceil((0.75 * total - attended) / 0.25))
            status_label = "shortage"
        elif pct >= 85.0:
            status_label = "safe"
            # How many can student miss: (attended) / (total + y) >= 0.75 => total + y <= attended / 0.75 => y <= (attended / 0.75) - total
            can_miss_for_75 = max(0, math.floor((attended / 0.75) - total))
        else:
            status_label = "adequate"
            can_miss_for_75 = max(0, math.floor((attended / 0.75) - total))

        details.append(
            AttendanceDetail(
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                faculty_name=course.faculty_name,
                total_classes=total,
                attended_classes=attended,
                missed_classes=missed,
                percentage=pct,
                is_shortage=is_short,
                status=status_label,
                classes_needed_for_75=needed_for_75,
                max_classes_can_miss_for_75=can_miss_for_75,
            )
        )
    return details


@router.get("/marks", response_model=List[CourseMarksSummary])
def get_student_marks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve comprehensive internal assessment marks per course with grade letter projections.
    """
    student = _get_target_student(current_user, db)
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student.id).all()
    all_marks = db.query(InternalMark).filter(InternalMark.user_id == student.id).all()

    marks_by_course: dict[int, list[InternalMark]] = {}
    for m in all_marks:
        marks_by_course.setdefault(m.course_id, []).append(m)

    summaries = []
    for enr in enrollments:
        course = enr.course
        if not course:
            continue

        c_marks = marks_by_course.get(course.id, [])
        assessments = [
            AssessmentMarkItem(
                id=m.id,
                assessment_name=m.assessment_name,
                max_marks=m.max_marks,
                obtained_marks=m.obtained_marks,
                percentage=round((m.obtained_marks / m.max_marks * 100), 1) if m.max_marks > 0 else 0.0,
                assessment_date=m.assessment_date.strftime("%b %d, %Y") if m.assessment_date else "Recorded",
            )
            for m in c_marks
        ]

        total_max = sum(m.max_marks for m in c_marks)
        total_obtained = sum(m.obtained_marks for m in c_marks)
        agg_pct = round((total_obtained / total_max * 100), 1) if total_max > 0 else 0.0

        if agg_pct >= 90:
            grade = "O (Outstanding)"
        elif agg_pct >= 80:
            grade = "A+ (Excellent)"
        elif agg_pct >= 70:
            grade = "A (Very Good)"
        elif agg_pct >= 60:
            grade = "B+ (Good)"
        elif agg_pct >= 50:
            grade = "B (Above Average)"
        else:
            grade = "C (Pass)"

        summaries.append(
            CourseMarksSummary(
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                credits=course.credits,
                assessments=assessments,
                total_max_marks=total_max,
                total_obtained_marks=total_obtained,
                aggregate_percentage=agg_pct,
                projected_grade=grade,
            )
        )
    return summaries


@router.get("/transcript", response_model=AcademicTranscriptResponse)
def get_academic_transcript(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve full semester-by-semester official academic transcript and SGPA progression.
    """
    student = _get_target_student(current_user, db)

    # Historic semesters 1 through 6
    semesters_data = [
        {
            "semester": 1,
            "academic_year": "2023-2024",
            "sgpa": 8.92,
            "credits_registered": 22,
            "credits_earned": 22,
            "courses": [
                {"code": "MAT101", "title": "Engineering Mathematics I", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "PHY101", "title": "Engineering Physics", "credits": 4, "grade": "A", "gp": 8.0},
                {"code": "CSE101", "title": "Problem Solving & C Programming", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "EEE101", "title": "Basic Electrical Engineering", "credits": 3, "grade": "A+", "gp": 9.0},
                {"code": "CIV101", "title": "Engineering Mechanics", "credits": 3, "grade": "A", "gp": 8.0},
                {"code": "LAB101", "title": "Physics & Programming Lab", "credits": 4, "grade": "O", "gp": 10.0},
            ],
        },
        {
            "semester": 2,
            "academic_year": "2023-2024",
            "sgpa": 9.08,
            "credits_registered": 22,
            "credits_earned": 22,
            "courses": [
                {"code": "MAT201", "title": "Engineering Mathematics II", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CHE201", "title": "Engineering Chemistry", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CSE201", "title": "Data Structures using C++", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "ECE201", "title": "Basic Electronics & Digital Logic", "credits": 3, "grade": "A", "gp": 8.0},
                {"code": "MEC201", "title": "Elements of Mechanical Eng.", "credits": 3, "grade": "A+", "gp": 9.0},
                {"code": "LAB201", "title": "Data Structures Lab", "credits": 4, "grade": "O", "gp": 10.0},
            ],
        },
        {
            "semester": 3,
            "academic_year": "2024-2025",
            "sgpa": 9.35,
            "credits_registered": 24,
            "credits_earned": 24,
            "courses": [
                {"code": "CS301", "title": "Design & Analysis of Algorithms", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "CS302", "title": "Operating Systems & Linux Kernel", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CS303", "title": "Discrete Mathematical Structures", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CS304", "title": "Computer Organization & Architecture", "credits": 4, "grade": "A", "gp": 8.0},
                {"code": "CS305", "title": "Object Oriented Programming Java", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "CS306", "title": "Algorithms & OS Laboratory", "credits": 4, "grade": "O", "gp": 10.0},
            ],
        },
        {
            "semester": 4,
            "academic_year": "2024-2025",
            "sgpa": 9.40,
            "credits_registered": 24,
            "credits_earned": 24,
            "courses": [
                {"code": "CS401", "title": "Database Management Systems", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "CS402", "title": "Computer Networks & Protocols", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CS403", "title": "Theory of Computation & Automata", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CS404", "title": "Software Engineering & Agile", "credits": 3, "grade": "O", "gp": 10.0},
                {"code": "CS405", "title": "Python for Data Science", "credits": 3, "grade": "O", "gp": 10.0},
                {"code": "CS406", "title": "DBMS & Networks Laboratory", "credits": 6, "grade": "O", "gp": 10.0},
            ],
        },
        {
            "semester": 5,
            "academic_year": "2025-2026",
            "sgpa": 9.06,
            "credits_registered": 22,
            "credits_earned": 22,
            "courses": [
                {"code": "CS501", "title": "Artificial Intelligence & Heuristics", "credits": 4, "grade": "A+", "gp": 9.0},
                {"code": "CS502", "title": "Web Application Architecture", "credits": 4, "grade": "O", "gp": 10.0},
                {"code": "CS503", "title": "Cloud Computing Infrastructure", "credits": 4, "grade": "A", "gp": 8.0},
                {"code": "CS504", "title": "Big Data Analytics & Spark", "credits": 3, "grade": "A+", "gp": 9.0},
                {"code": "CS505", "title": "Information Security Principles", "credits": 3, "grade": "A+", "gp": 9.0},
                {"code": "CS506", "title": "AI & Web Technologies Lab", "credits": 4, "grade": "O", "gp": 10.0},
            ],
        },
        {
            "semester": 6,
            "academic_year": "2025-2026",
            "sgpa": 9.24,
            "credits_registered": 18,
            "credits_earned": 18,
            "courses": [
                {"code": "CS601", "title": "Distributed Cloud Systems", "credits": 4, "grade": "A+", "gp": 9.2},
                {"code": "CS602", "title": "Natural Language Processing & GenAI", "credits": 4, "grade": "A", "gp": 8.8},
                {"code": "CS603", "title": "Compiler Design & Optimization", "credits": 4, "grade": "O", "gp": 9.6},
                {"code": "CS604", "title": "Machine Learning Laboratory", "credits": 2, "grade": "O", "gp": 9.8},
                {"code": "CS605", "title": "Enterprise Software Architecture", "credits": 3, "grade": "A+", "gp": 9.2},
            ],
        },
    ]

    total_credits = sum(s["credits_earned"] for s in semesters_data)
    total_grade_points = sum(s["sgpa"] * s["credits_earned"] for s in semesters_data)
    cgpa = round(total_grade_points / total_credits, 2)

    return AcademicTranscriptResponse(
        student_name=student.full_name,
        student_id=student.student_id or student.email,
        department=student.department or "Computer Science & Engineering",
        cgpa=cgpa,
        total_credits_earned=total_credits,
        semesters=[SemesterTranscriptItem(**s) for s in semesters_data],
    )


@router.get("/electives", response_model=List[ElectiveCourseOption])
def get_available_electives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve open professional electives for course selection.
    """
    student = _get_target_student(current_user, db)
    enrolled_ids = {e.course_id for e in db.query(Enrollment).filter(Enrollment.user_id == student.id).all()}

    electives = db.query(Course).filter(Course.course_type == CourseType.ELECTIVE).all()
    return [
        ElectiveCourseOption(
            id=c.id,
            code=c.code,
            title=c.title,
            credits=c.credits,
            faculty_name=c.faculty_name,
            syllabus_summary=c.syllabus_summary,
            available_seats=45,
            is_selected=c.id in enrolled_ids,
        )
        for c in electives
    ]


@router.post("/electives/register")
def register_elective_course(
    request: ElectiveRegistrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Register an elective course for the active student profile.
    """
    student = _get_target_student(current_user, db)
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elective course not found")

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == student.id,
        Enrollment.course_id == course.id,
    ).first()

    if existing:
        return {"message": f"Already enrolled in {course.code}: {course.title}", "enrolled": True}

    new_enr = Enrollment(
        user_id=student.id,
        course_id=course.id,
        academic_year="2026-2027",
        semester=student.semester or 6,
    )
    db.add(new_enr)
    db.commit()

    return {
        "message": f"Successfully enrolled in {course.code}: {course.title}",
        "course_code": course.code,
        "credits": course.credits,
        "enrolled": True,
    }
