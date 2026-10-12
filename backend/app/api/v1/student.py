import math
from datetime import datetime, timezone, date
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User,
    UserRole,
    Enrollment,
    Attendance,
    InternalMark,
    Course,
    ExamSchedule,
    HallTicket,
    FeeRecord,
    Notice,
)
from app.schemas.student import (
    StudentDashboardResponse,
    CourseAttendanceSummary,
    ScheduleItem,
    UpcomingExamItem,
    DashboardNoticeItem,
    AIInsightItem,
)

router = APIRouter(prefix="/student", tags=["Student Portal"])


@router.get("/dashboard", response_model=StudentDashboardResponse)
def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve comprehensive student dashboard metrics, attendance rates,
    today's lecture schedule, exam timetables, fee summaries, and AI insights.
    """
    # If user is admin/faculty and doesn't have student records, default to first student for demo preview
    student = current_user
    if current_user.role != UserRole.STUDENT:
        demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
        if demo_student:
            student = demo_student

    # 1. Fetch Student Enrollments and Attendance
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student.id).all()
    attendance_records = db.query(Attendance).filter(Attendance.user_id == student.id).all()

    attendance_map = {att.course_id: att for att in attendance_records}

    course_summaries: list[CourseAttendanceSummary] = []
    total_attended = 0
    total_conducted = 0
    shortage_count = 0
    shortage_courses_names = []

    for enr in enrollments:
        course = enr.course
        if not course:
            continue

        att = attendance_map.get(course.id)
        attended = att.attended_classes if att else 0
        total = att.total_classes if att else 0

        total_attended += attended
        total_conducted += total

        pct = round((attended / total * 100), 1) if total > 0 else 100.0
        is_short = pct < 75.0

        needed_for_75 = 0
        if is_short and total > 0:
            # Formula: (attended + x) / (total + x) >= 0.75 => x >= (0.75 * total - attended) / 0.25
            needed_for_75 = max(1, math.ceil((0.75 * total - attended) / 0.25))
            shortage_count += 1
            shortage_courses_names.append(course.code)

        course_summaries.append(
            CourseAttendanceSummary(
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                faculty_name=course.faculty_name,
                attended_classes=attended,
                total_classes=total,
                percentage=pct,
                is_shortage=is_short,
                classes_needed_for_75=needed_for_75,
            )
        )

    overall_att_pct = (
        round((total_attended / total_conducted * 100), 1)
        if total_conducted > 0
        else 100.0
    )

    # 2. Today's Academic Schedule (Derived from enrolled courses)
    today_schedule: list[ScheduleItem] = []
    schedule_slots = [
        ("09:00 AM - 10:30 AM", "completed"),
        ("11:00 AM - 01:00 PM", "ongoing"),
        ("02:00 PM - 03:30 PM", "upcoming"),
        ("03:45 PM - 05:00 PM", "upcoming"),
    ]

    for idx, enr in enumerate(enrollments[:4]):
        course = enr.course
        if not course:
            continue
        slot = schedule_slots[idx % len(schedule_slots)]
        today_schedule.append(
            ScheduleItem(
                time_slot=slot[0],
                course_code=course.code,
                course_title=course.title,
                room_number=f"Hall {401 + idx}, Block A" if course.course_type.value != "lab" else "AI & Cloud Lab 2",
                faculty_name=course.faculty_name,
                status=slot[1],
            )
        )

    # 3. Upcoming Examinations Countdown
    upcoming_exams: list[UpcomingExamItem] = []
    exam_records = db.query(ExamSchedule).all()
    today_date = date.today()

    for exam in exam_records:
        course = exam.course
        course_code = course.code if course else "EXAM"
        course_title = course.title if course else exam.exam_name

        days_left = 12
        try:
            exam_dt = datetime.strptime(exam.exam_date, "%Y-%m-%d").date()
            diff = (exam_dt - today_date).days
            days_left = max(1, diff)
        except Exception:
            pass

        upcoming_exams.append(
            UpcomingExamItem(
                course_code=course_code,
                course_title=course_title,
                exam_name=exam.exam_name,
                exam_date=exam.exam_date,
                time_slot=exam.time_slot,
                room_number=exam.room_number,
                days_left=days_left,
            )
        )

    # 4. Fee Record & Balance
    fees = db.query(FeeRecord).filter(FeeRecord.user_id == student.id).all()
    total_fee_balance = sum(fee.balance_due for fee in fees)

    # 5. Hall Ticket Status
    hall_ticket = db.query(HallTicket).filter(HallTicket.user_id == student.id).first()
    hall_ticket_eligible = hall_ticket.is_eligible if hall_ticket else True

    # 6. Notices
    notices_db = db.query(Notice).order_by(Notice.is_pinned.desc(), Notice.published_at.desc()).limit(5).all()
    notices: list[DashboardNoticeItem] = [
        DashboardNoticeItem(
            id=n.id,
            title=n.title,
            content=n.content,
            category=n.category.value,
            priority=n.priority.value,
            published_by=n.published_by,
            published_at=n.published_at.strftime("%b %d, %Y") if n.published_at else "Today",
            is_pinned=n.is_pinned,
        )
        for n in notices_db
    ]

    # 7. AI Insights formulation
    insights: list[AIInsightItem] = []

    if shortage_count > 0:
        insights.append(
            AIInsightItem(
                category="Attendance Alert",
                title=f"Attendance Shortage in {', '.join(shortage_courses_names)}",
                message=f"You have {shortage_count} subject(s) below the 75.0% threshold. Attend upcoming lectures to prevent hall ticket barring.",
                action_text="View Attendance Policy",
                action_intent="attendance_policy",
            )
        )
    else:
        insights.append(
            AIInsightItem(
                category="Attendance Status",
                title="100% Exam Attendance Eligibility",
                message="All registered courses meet the mandatory 75% attendance criterion.",
                action_text="View Detailed Log",
                action_intent="view_attendance",
            )
        )

    insights.append(
        AIInsightItem(
            category="Exam Preparation",
            title="Mid-Semester 2 Schedule Active",
            message="Your next exam is CS601 Distributed Systems. Review RAG knowledge base for lecture summaries.",
            action_text="Ask AI for Study Guide",
            action_intent="generate_study_guide",
        )
    )

    return StudentDashboardResponse(
        student_name=student.full_name,
        student_id=student.student_id or student.email,
        department=student.department or "Computer Science & Engineering",
        semester=student.semester or 6,
        cgpa=9.24,
        gpa_trend="+0.18 vs Sem 5",
        total_credits_earned=132,
        total_credits_required=160,
        overall_attendance_pct=overall_att_pct,
        attendance_shortages_count=shortage_count,
        fee_balance_due=total_fee_balance,
        hall_ticket_eligible=hall_ticket_eligible,
        courses_attendance=course_summaries,
        today_schedule=today_schedule,
        upcoming_exams=upcoming_exams,
        recent_notices=notices,
        ai_insights=insights,
    )
