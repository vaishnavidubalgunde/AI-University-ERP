import uuid
import math
from datetime import datetime, timezone, date
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User,
    UserRole,
    Enrollment,
    Attendance,
    ExamSchedule,
    HallTicket,
    FeeRecord,
    Course,
)
from app.schemas.exam import (
    WeeklyTimetableResponse,
    DayTimetable,
    TimetableSlot,
    ExamScheduleDetail,
    ExamEligibilityResponse,
    CourseEligibilityItem,
    HallTicketResponse,
    HallTicketCourseItem,
)

router = APIRouter(prefix="/exams", tags=["Examinations & Timetable"])


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context (allowing faculty/admin preview)."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


@router.get("/timetable/weekly", response_model=WeeklyTimetableResponse)
def get_weekly_timetable(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve full weekly academic timetable with lecture and lab slots.
    """
    student = _get_target_student(current_user, db)

    days_data = [
        DayTimetable(
            day="Monday",
            slots=[
                TimetableSlot(id="mon-1", time_slot="09:00 AM - 10:30 AM", course_code="CS601", course_title="Distributed Cloud Systems", room_number="Hall 402, Block A", faculty_name="Dr. Rajesh Sharma", slot_type="lecture"),
                TimetableSlot(id="mon-2", time_slot="10:45 AM - 12:15 PM", course_code="CS602", course_title="Natural Language Processing", room_number="Hall 402, Block A", faculty_name="Prof. Sneha Rao", slot_type="lecture"),
                TimetableSlot(id="mon-3", time_slot="01:15 PM - 02:45 PM", course_code="CS603", course_title="Compiler Design & Optimization", room_number="Hall 405, Block A", faculty_name="Dr. Vikram Joshi", slot_type="lecture"),
                TimetableSlot(id="mon-4", time_slot="03:00 PM - 04:30 PM", course_code="CS605", course_title="Enterprise Software Architecture", room_number="Hall 402, Block A", faculty_name="Prof. Arvind Swamy", slot_type="tutorial"),
            ]
        ),
        DayTimetable(
            day="Tuesday",
            slots=[
                TimetableSlot(id="tue-1", time_slot="09:00 AM - 10:30 AM", course_code="CS603", course_title="Compiler Design & Optimization", room_number="Hall 405, Block A", faculty_name="Dr. Vikram Joshi", slot_type="lecture"),
                TimetableSlot(id="tue-2", time_slot="10:45 AM - 12:15 PM", course_code="CS601", course_title="Distributed Cloud Systems", room_number="Hall 402, Block A", faculty_name="Dr. Rajesh Sharma", slot_type="lecture"),
                TimetableSlot(id="tue-3", time_slot="01:15 PM - 04:15 PM", course_code="CS604", course_title="Machine Learning Laboratory", room_number="AI & Cloud Lab 2", faculty_name="Prof. Sneha Rao", slot_type="lab"),
            ]
        ),
        DayTimetable(
            day="Wednesday",
            slots=[
                TimetableSlot(id="wed-1", time_slot="09:00 AM - 10:30 AM", course_code="CS602", course_title="Natural Language Processing", room_number="Hall 402, Block A", faculty_name="Prof. Sneha Rao", slot_type="lecture"),
                TimetableSlot(id="wed-2", time_slot="10:45 AM - 12:15 PM", course_code="CS605", course_title="Enterprise Software Architecture", room_number="Hall 402, Block A", faculty_name="Prof. Arvind Swamy", slot_type="lecture"),
                TimetableSlot(id="wed-3", time_slot="01:15 PM - 02:45 PM", course_code="CS601", course_title="Distributed Cloud Systems", room_number="Hall 402, Block A", faculty_name="Dr. Rajesh Sharma", slot_type="tutorial"),
                TimetableSlot(id="wed-4", time_slot="03:00 PM - 04:30 PM", course_code="CS606", course_title="Cyber Security & Cryptography", room_number="Hall 405, Block A", faculty_name="Dr. Anand Murthy", slot_type="lecture"),
            ]
        ),
        DayTimetable(
            day="Thursday",
            slots=[
                TimetableSlot(id="thu-1", time_slot="09:00 AM - 10:30 AM", course_code="CS605", course_title="Enterprise Software Architecture", room_number="Hall 402, Block A", faculty_name="Prof. Arvind Swamy", slot_type="lecture"),
                TimetableSlot(id="thu-2", time_slot="10:45 AM - 12:15 PM", course_code="CS603", course_title="Compiler Design & Optimization", room_number="Hall 405, Block A", faculty_name="Dr. Vikram Joshi", slot_type="lecture"),
                TimetableSlot(id="thu-3", time_slot="01:15 PM - 04:15 PM", course_code="CS604", course_title="Machine Learning Laboratory", room_number="AI & Cloud Lab 2", faculty_name="Prof. Sneha Rao", slot_type="lab"),
            ]
        ),
        DayTimetable(
            day="Friday",
            slots=[
                TimetableSlot(id="fri-1", time_slot="09:00 AM - 10:30 AM", course_code="CS601", course_title="Distributed Cloud Systems", room_number="Hall 402, Block A", faculty_name="Dr. Rajesh Sharma", slot_type="lecture"),
                TimetableSlot(id="fri-2", time_slot="10:45 AM - 12:15 PM", course_code="CS602", course_title="Natural Language Processing", room_number="Hall 402, Block A", faculty_name="Prof. Sneha Rao", slot_type="lecture"),
                TimetableSlot(id="fri-3", time_slot="01:15 PM - 02:45 PM", course_code="CS606", course_title="Cyber Security & Cryptography", room_number="Hall 405, Block A", faculty_name="Dr. Anand Murthy", slot_type="lecture"),
                TimetableSlot(id="fri-4", time_slot="03:00 PM - 04:30 PM", course_code="SEM601", course_title="Technical Seminar & Project Review", room_number="Seminar Hall 1", faculty_name="Dr. Rajesh Sharma", slot_type="seminar"),
            ]
        ),
        DayTimetable(
            day="Saturday",
            slots=[
                TimetableSlot(id="sat-1", time_slot="09:00 AM - 11:00 AM", course_code="CS604", course_title="Open Lab Practical / Doubt Clearing", room_number="AI & Cloud Lab 2", faculty_name="Prof. Sneha Rao", slot_type="lab"),
                TimetableSlot(id="sat-2", time_slot="11:15 AM - 01:00 PM", course_code="CLUB601", course_title="Hackathon & ACM Student Chapter Activity", room_number="Turing Auditorium", faculty_name="Faculty Coordinator", slot_type="seminar"),
            ]
        ),
    ]

    return WeeklyTimetableResponse(
        academic_year="2026-2027",
        semester=student.semester or 6,
        department=student.department or "Computer Science & Engineering",
        days=days_data,
    )


@router.get("/schedules", response_model=List[ExamScheduleDetail])
def get_exam_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve mid-semester and end-semester examination timetable with room and seat allocations.
    """
    schedules = db.query(ExamSchedule).all()
    today_date = date.today()

    result = []
    seat_counter = 12
    for s in schedules:
        course = s.course
        course_code = course.code if course else "EXAM"
        course_title = course.title if course else s.exam_name

        days_left = 12
        is_completed = False
        try:
            exam_dt = datetime.strptime(s.exam_date, "%Y-%m-%d").date()
            diff = (exam_dt - today_date).days
            days_left = diff
            is_completed = diff < 0
        except Exception:
            pass

        seat_counter += 1
        result.append(
            ExamScheduleDetail(
                id=s.id,
                course_code=course_code,
                course_title=course_title,
                exam_name=s.exam_name,
                exam_date=s.exam_date,
                time_slot=s.time_slot,
                reporting_time="30 minutes prior to start time",
                room_number=s.room_number,
                seat_number=f"A-402-{seat_counter}",
                max_marks=s.max_marks,
                days_left=max(0, days_left),
                is_completed=is_completed,
            )
        )
    return result


@router.get("/eligibility", response_model=ExamEligibilityResponse)
def get_exam_eligibility(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Deterministic rule-based examination eligibility audit.
    Evaluates course-wise attendance >= 75.0% and fee clearances.
    """
    student = _get_target_student(current_user, db)

    enrollments = db.query(Enrollment).filter(Enrollment.user_id == student.id).all()
    attendance_records = db.query(Attendance).filter(Attendance.user_id == student.id).all()
    attendance_map = {att.course_id: att for att in attendance_records}

    course_eligibilities: list[CourseEligibilityItem] = []
    attendance_passed = True
    ineligibility_reasons: list[str] = []

    for enr in enrollments:
        course = enr.course
        if not course:
            continue

        att = attendance_map.get(course.id)
        pct = att.percentage if att else 100.0
        is_eligible = pct >= 75.0

        reason = None
        if not is_eligible:
            attendance_passed = False
            needed = 6
            if att and att.total_classes > 0:
                needed = max(1, math.ceil((0.75 * att.total_classes - att.attended_classes) / 0.25))
            reason = f"Attendance {pct}% is below 75% requirement. Need {needed} consecutive classes."
            ineligibility_reasons.append(f"{course.code}: {reason}")

        course_eligibilities.append(
            CourseEligibilityItem(
                course_code=course.code,
                course_title=course.title,
                attendance_pct=pct,
                is_eligible=is_eligible,
                reason=reason,
            )
        )

    # Fee Clearance check
    fees = db.query(FeeRecord).filter(FeeRecord.user_id == student.id).all()
    total_due = sum(f.balance_due for f in fees)
    fee_passed = total_due == 0

    if not fee_passed:
        ineligibility_reasons.append(f"Outstanding fee balance: Rs {total_due:,.2f}")

    disciplinary_passed = True
    overall_eligible = attendance_passed and fee_passed and disciplinary_passed

    return ExamEligibilityResponse(
        student_name=student.full_name,
        student_id=student.student_id or student.email,
        semester=student.semester or 6,
        overall_eligible=overall_eligible,
        ineligibility_reasons=ineligibility_reasons,
        attendance_clearance=attendance_passed,
        fee_clearance=fee_passed,
        disciplinary_clearance=disciplinary_passed,
        fee_balance_due=total_due,
        course_eligibilities=course_eligibilities,
    )


@router.get("/hall-ticket", response_model=HallTicketResponse)
def get_hall_ticket(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve verifiable digital hall ticket with QR code security payload.
    """
    student = _get_target_student(current_user, db)

    hall_ticket = db.query(HallTicket).filter(HallTicket.user_id == student.id).first()
    if not hall_ticket:
        hall_ticket = HallTicket(
            user_id=student.id,
            semester=student.semester or 6,
            academic_year="2026-2027",
            is_eligible=True,
            qr_token=str(uuid.uuid4()),
        )
        db.add(hall_ticket)
        db.commit()

    schedules = db.query(ExamSchedule).all()
    course_items = [
        HallTicketCourseItem(
            course_code=s.course.code if s.course else "EXAM",
            course_title=s.course.title if s.course else s.exam_name,
            exam_date=s.exam_date,
            time_slot=s.time_slot,
            room_number=s.room_number,
            seat_number=f"A-402-{14 + idx}",
        )
        for idx, s in enumerate(schedules)
    ]

    instructions = [
        "Candidates must occupy their allocated examination seats at least 15 minutes before commencement.",
        "Valid institutional identity card and this digital/printed hall ticket are strictly mandatory.",
        "Possession of mobile phones, programmable calculators, or unauthorized materials is strictly prohibited.",
        "No candidate will be permitted to enter the examination hall after 30 minutes of scheduled start time.",
    ]

    return HallTicketResponse(
        hall_ticket_number=f"HT-2026-SEM6-{student.student_id or '042'}",
        qr_token=hall_ticket.qr_token,
        student_name=student.full_name,
        student_id=student.student_id or student.email,
        department=student.department or "Computer Science & Engineering",
        semester=student.semester or 6,
        academic_year=hall_ticket.academic_year,
        is_eligible=hall_ticket.is_eligible,
        ineligibility_reason=hall_ticket.ineligibility_reason,
        issued_date=hall_ticket.issued_at.strftime("%B %d, %Y") if hall_ticket.issued_at else "February 22, 2026",
        courses=course_items,
        exam_center="Central Examination Block, Campus Main Building",
        instructions=instructions,
    )
