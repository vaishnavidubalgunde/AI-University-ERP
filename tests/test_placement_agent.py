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
from app.models.placement import PlacementDrive
from app.ai.agents.placement_agent import PlacementAgent
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


def test_ctc_tier_classification():
    """Verify deterministic categorization into university recruitment tiers."""
    assert PlacementAgent.classify_ctc_tier(28.5) == "Super Dream"
    assert PlacementAgent.classify_ctc_tier(21.0) == "Super Dream"
    assert PlacementAgent.classify_ctc_tier(16.0) == "Dream"
    assert PlacementAgent.classify_ctc_tier(10.0) == "Dream"
    assert PlacementAgent.classify_ctc_tier(7.5) == "Core / Mass"
    assert PlacementAgent.classify_ctc_tier(4.5) == "Core / Mass"


def test_one_student_one_offer_upgrade_rule():
    """Verify 1.5x upgrade policy math for existing offer holders."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        # Create dummy drives for testing
        drive_low = PlacementDrive(
            company_name="Low Inc",
            job_role="Engineer",
            ctc_lpa=10.0,
            eligibility_min_cgpa=7.0,
            eligible_departments="CSE, ISE",
            max_backlogs=0,
            drive_date="2026-05-01",
            application_deadline="2026-04-20",
        )
        drive_high = PlacementDrive(
            company_name="High Corp",
            job_role="Senior Engineer",
            ctc_lpa=15.0,
            eligibility_min_cgpa=7.0,
            eligible_departments="CSE, ISE",
            max_backlogs=0,
            drive_date="2026-05-01",
            application_deadline="2026-04-20",
        )

        # Existing offer = 8.0 LPA -> 1.5x = 12.0 LPA minimum
        eval_low = PlacementAgent.evaluate_drive_eligibility(student, drive_low, existing_offer_ctc=8.0)
        assert eval_low["upgrade_rule_passed"] is False
        assert eval_low["is_overall_eligible"] is False

        eval_high = PlacementAgent.evaluate_drive_eligibility(student, drive_high, existing_offer_ctc=8.0)
        assert eval_high["upgrade_rule_passed"] is True
        assert eval_high["is_overall_eligible"] is True
    finally:
        db.close()


def test_student_placement_drives_evaluation():
    """Verify student placement evaluation against seeded drives."""
    db: Session = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "alex.kumar@univ.edu").first()
        assert student is not None

        audit = PlacementAgent.evaluate_all_drives(user_id=student.id, db=db)
        assert audit["total_active_drives"] >= 3
        assert audit["eligible_drives_count"] >= 1
        assert len(audit["drives"]) == audit["total_active_drives"]

        for d in audit["drives"]:
            assert "company_name" in d
            assert "tier" in d
            assert "cgpa_passed" in d
            assert "skill_match_percentage" in d
            assert d["skill_match_percentage"] > 0
    finally:
        db.close()


def test_placement_agent_rest_endpoint():
    """Verify POST /api/v1/ai/agents/placement endpoint."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/agents/placement",
        headers=headers,
        json={"query": "Am I eligible for Google India software engineer role?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_name"] == "Alex Kumar"
    assert data["total_active_drives"] >= 3
    assert data["focused_drive"] is not None
    assert "Google" in data["focused_drive"]["company_name"]
    assert len(data["advisory_markdown"]) > 50
    assert len(data["citations"]) >= 1


def test_chat_placement_intent_agent_invocation():
    """Verify that sending a placement query via chat invokes the Placement Coordinator agent."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"message": "What is the One Student One Offer policy for Super Dream upgrades?"},
    )
    assert res.status_code == 200
    data = res.json()
    ai_msg = data["ai_message"]
    assert ai_msg["sender"] == "ai_agent"
    assert ai_msg["agent_name"] == "Placement Coordinator"
    assert "Placement" in ai_msg["content"] or "Offer" in ai_msg["content"]
