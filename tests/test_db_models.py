import os
import sys
# pyrefly: ignore [missing-import]
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# pyrefly: ignore [missing-import]
from app.core.database import SessionLocal
# pyrefly: ignore [missing-import]
from app.models import (
    User,
    UserRole,
    Department,
    Course,
    Enrollment,
    Attendance,
    InternalMark,
    ExamSchedule,
    HallTicket,
    FeeRecord,
    FeeStatus,
    Notice,
    PlacementDrive,
    PlacementApplication,
    Grievance,
    ChatSession,
    ChatMessage,
    SenderType,
    QueryIntent,
)
# pyrefly: ignore [missing-import]
from app.db.seed import seed_database


@pytest.fixture(scope="module")
def db_session():
    """Create test session fixture with full university dataset seeded."""
    seed_database()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_users_and_roles(db_session):
    """Verify User model, roles, and contextual properties."""
    student = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    assert student is not None
    assert student.role == UserRole.STUDENT
    assert student.student_id == "1DT23CS238"
    assert student.semester == 6
    assert student.is_active is True

    faculty = db_session.query(User).filter(User.email == "dr.sharma@univ.edu").first()
    assert faculty is not None
    assert faculty.role == UserRole.FACULTY

    admin = db_session.query(User).filter(User.email == "admin@univ.edu").first()
    assert admin is not None
    assert admin.role == UserRole.ADMIN


def test_departments_and_courses(db_session):
    """Verify Department, Course, and Enrollment models and relationships."""
    cse_dept = db_session.query(Department).filter(Department.code == "CSE").first()
    assert cse_dept is not None
    assert "Computer Science" in cse_dept.name
    assert len(cse_dept.courses) >= 6

    # Verify a specific course
    cs601 = db_session.query(Course).filter(Course.code == "CS601").first()
    assert cs601 is not None
    assert cs601.credits == 4
    assert cs601.department_id == cse_dept.id

    # Verify student enrollment
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    enrollment = db_session.query(Enrollment).filter(
        Enrollment.user_id == alex.id,
        Enrollment.course_id == cs601.id,
    ).first()
    assert enrollment is not None
    assert enrollment.semester == 6
    assert enrollment.course.code == "CS601"


def test_student_attendance_and_percentages(db_session):
    """Verify Attendance model and computed properties."""
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    assert alex is not None

    attendance_records = db_session.query(Attendance).filter(Attendance.user_id == alex.id).all()
    assert len(attendance_records) >= 5

    # Check CS601 attendance (healthy attendance)
    cs601 = db_session.query(Course).filter(Course.code == "CS601").first()
    att_601 = db_session.query(Attendance).filter(
        Attendance.user_id == alex.id,
        Attendance.course_id == cs601.id,
    ).first()
    assert att_601 is not None
    assert att_601.percentage >= 88.0
    assert not att_601.is_shortage
    assert att_601.classes_needed_for_75 == 0
    assert att_601.max_classes_can_miss_for_75 >= 0

    # Check CS602 shortage
    cs602 = db_session.query(Course).filter(Course.code == "CS602").first()
    att_602 = db_session.query(Attendance).filter(
        Attendance.user_id == alex.id,
        Attendance.course_id == cs602.id,
    ).first()
    assert att_602 is not None
    assert att_602.percentage < 75.0
    assert att_602.is_shortage is True
    assert att_602.classes_needed_for_75 > 0


def test_internal_marks_records(db_session):
    """Verify internal marks ledger."""
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    marks = db_session.query(InternalMark).filter(InternalMark.user_id == alex.id).all()
    assert len(marks) >= 8
    for m in marks:
        assert m.obtained_marks <= m.max_marks


def test_exam_schedules_and_hall_tickets(db_session):
    """Verify exam schedules and student hall ticket."""
    exams = db_session.query(ExamSchedule).all()
    assert len(exams) >= 5

    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    ticket = db_session.query(HallTicket).filter(HallTicket.user_id == alex.id).first()
    assert ticket is not None
    assert ticket.is_eligible is True
    assert ticket.qr_token is not None


def test_fee_records_and_balances(db_session):
    """Verify fee records and balance due calculations."""
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    fees = db_session.query(FeeRecord).filter(FeeRecord.user_id == alex.id).all()
    assert len(fees) >= 2
    for fee in fees:
        assert fee.status == FeeStatus.PAID
        assert fee.balance_due == 0.0


def test_notices_and_bulletins(db_session):
    """Verify university notice board records."""
    notices = db_session.query(Notice).all()
    assert len(notices) >= 4
    pinned = [n for n in notices if n.is_pinned]
    assert len(pinned) >= 2


def test_placements_and_applications(db_session):
    """Verify placement drives and applications."""
    drives = db_session.query(PlacementDrive).all()
    assert len(drives) >= 3

    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    alex_apps = db_session.query(PlacementApplication).filter(PlacementApplication.user_id == alex.id).all()
    assert len(alex_apps) >= 1
    assert alex_apps[0].drive.company_name == "Google India"


def test_grievances(db_session):
    """Verify support grievance tickets."""
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    grievances = db_session.query(Grievance).filter(Grievance.user_id == alex.id).all()
    assert len(grievances) >= 1
    assert "GRV-" in grievances[0].ticket_number


def test_ai_chat_session_and_messages(db_session):
    """Verify AI chat sessions and contextual message memory."""
    alex = db_session.query(User).filter(User.email == "alex.kumar@univ.edu").first()
    sessions = db_session.query(ChatSession).filter(ChatSession.user_id == alex.id).all()
    assert len(sessions) >= 1

    first_session = sessions[0]
    assert len(first_session.messages) >= 2
    msg_user = first_session.messages[0]
    msg_ai = first_session.messages[1]

    # Flexible verification across Enum or string
    assert msg_user.sender == SenderType.USER or getattr(msg_user.sender, "value", None) == "user" or msg_user.sender == "user"
    assert msg_ai.sender == SenderType.AI_AGENT or getattr(msg_ai.sender, "value", None) == "ai_agent" or msg_ai.sender == "ai_agent"
    assert msg_ai.sources_json is not None
