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
from app.ai.agents.academic_agent import AcademicAgent
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


def test_classes_needed_formula_math():
    """Verify mathematical precision of attendance recovery formula."""
    # Scenario: 20 out of 30 classes attended (66.67%).
    # Target 75%: (0.75*30 - 20) / 0.25 = 2.5 / 0.25 = 10 classes
    needed = AcademicAgent.calculate_classes_needed_for_target(attended=20, total=30, target_pct=75.0)
    assert needed == 10
    # Verification: (20+10) / (30+10) = 30/40 = 75.0%
    assert (20 + needed) / (30 + needed) >= 0.75

    # Scenario: Already 80% (24/30) -> 0 classes needed
    assert AcademicAgent.calculate_classes_needed_for_target(attended=24, total=30, target_pct=75.0) == 0


def test_safe_missable_classes_math():
    """Verify mathematical calculation of safe missable classes buffer."""
    # Scenario: 36 out of 40 classes attended (90%).
    # Target 75%: 36 / 0.75 - 40 = 48 - 40 = 8 classes
    missable = AcademicAgent.calculate_safe_missable_classes(attended=36, total=40, target_pct=75.0)
    assert missable == 8
    # Verification: 36 / (40 + 8) = 36/48 = 75.0%
    assert 36 / (40 + missable) >= 0.75


def test_academic_agent_attendance_analysis():
    """Verify student attendance analysis from live database."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        analysis = AcademicAgent.analyze_attendance(user_id=student.id, db=db)
        assert analysis["total_courses"] >= 4
        assert analysis["average_attendance"] > 60.0
        assert len(analysis["courses"]) == analysis["total_courses"]

        # Check course structure
        sample_c = analysis["courses"][0]
        assert "course_code" in sample_c
        assert "percentage" in sample_c
        assert "consecutive_classes_needed_for_75" in sample_c
        assert "condonation_status" in sample_c
    finally:
        db.close()


def test_academic_agent_cie_marks_analysis():
    """Verify student CIE marks evaluation."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        cie_analysis = AcademicAgent.analyze_cie_marks(user_id=student.id, db=db)
        assert cie_analysis["total_evaluated_courses"] >= 4
        assert cie_analysis["average_cie_marks"] > 0
        assert cie_analysis["cie_cleared_count"] >= 1
    finally:
        db.close()


def test_academic_agent_rest_endpoint():
    """Verify POST /api/v1/ai/agents/academic endpoint."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/agents/academic",
        headers=headers,
        json={"query": "Calculate recovery for CS602 attendance shortage"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_name"] == "Alex Kumar"
    assert data["attendance_analysis"]["total_courses"] >= 4
    assert len(data["advisory_markdown"]) > 50
    assert len(data["citations"]) >= 1
