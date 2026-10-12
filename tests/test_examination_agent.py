import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.ai.agents.examination_agent import ExaminationAgent
from app.db.seed import seed_database
from app.ai.rag.ingest import ingest_knowledge_base

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()
    ingest_knowledge_base()


def get_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_student_exam_eligibility_evaluation():
    """Verify deterministic multi-condition examination eligibility evaluation."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        eligibility = ExaminationAgent.evaluate_student_eligibility(user_id=student.id, db=db)
        assert "overall_status" in eligibility
        assert "is_overall_eligible" in eligibility
        assert "fee_balance_due" in eligibility
        assert "fee_clearance_passed" in eligibility
        assert eligibility["total_courses"] >= 4
        assert len(eligibility["courses"]) == eligibility["total_courses"]

        # Check structure of each evaluated course
        for c in eligibility["courses"]:
            assert "course_code" in c
            assert "attendance_percentage" in c
            assert "cie_marks" in c
            assert "is_course_eligible" in c
    finally:
        db.close()


def test_exam_schedules_and_seat_plan():
    """Verify SEE examination timetable retrieval and countdown calculation."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        schedules = ExaminationAgent.get_exam_schedules_and_seat_plan(user_id=student.id, db=db)
        assert len(schedules) >= 1
        sample_s = schedules[0]
        assert "course_code" in sample_s
        assert "exam_date" in sample_s
        assert "time_slot" in sample_s
        assert "room_number" in sample_s
        assert "days_remaining" in sample_s
    finally:
        db.close()


def test_digital_hall_ticket_verification():
    """Verify Digital Hall Ticket issuance status and cryptographic SHA-256 signature."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        ticket = ExaminationAgent.verify_digital_hall_ticket(user_id=student.id, db=db)
        assert ticket["has_hall_ticket"] is True
        assert ticket["usn"] is not None
        assert ticket["qr_token"] is not None
        assert ticket["cryptographic_signature"] is not None
        assert len(ticket["cryptographic_signature"]) == 16
    finally:
        db.close()


def test_examination_agent_rest_endpoint():
    """Verify POST /api/v1/ai/agents/examination endpoint."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/agents/examination",
        headers=headers,
        json={"query": "Am I eligible for my upcoming Semester End Exams?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_name"] == "Alex Kumar"
    assert "eligibility_summary" in data
    assert len(data["exam_schedules"]) >= 1
    assert data["hall_ticket"]["has_hall_ticket"] is True
    assert len(data["advisory_markdown"]) > 50
    assert len(data["citations"]) >= 1


def test_chat_exam_intent_agent_invocation():
    """Verify that sending an exam query via chat invokes the Examination Officer agent."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"message": "What is my exam schedule and hall ticket status?"},
    )
    assert res.status_code == 200
    data = res.json()
    ai_msg = data["ai_message"]
    assert ai_msg["sender"] == "ai_agent"
    assert ai_msg["agent_name"] == "Examination Officer"
    assert "Digital Hall Ticket" in ai_msg["content"] or "Examination" in ai_msg["content"]
