import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.ai.intent_router import DeterministicIntentRouter
from app.db.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()


def get_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_academic_intent_and_entity_extraction():
    """Verify academic queries extract course codes and percentage entities."""
    query = "What is the condonation policy if my attendance in CS602 is 68% for semester 6?"
    res = DeterministicIntentRouter.classify(query)

    assert res.primary_intent == "academic"
    assert "Academic" in res.recommended_agent
    assert "CS602" in res.extracted_entities.course_codes
    assert any("68" in p for p in res.extracted_entities.percentages)
    assert 6 in res.extracted_entities.semesters
    assert res.confidence >= 0.70


def test_examination_intent_classification():
    """Verify examination questions route to Examination Officer."""
    query = "Where can I download my digital hall ticket with QR code for the SEE examination timetable?"
    res = DeterministicIntentRouter.classify(query)

    assert res.primary_intent == "examination"
    assert "Examination" in res.recommended_agent
    assert res.confidence >= 0.70


def test_placement_intent_and_company_extraction():
    """Verify placement inquiries extract company name and CGPA."""
    query = "Am I eligible for Google India super dream placement drive with CGPA 8.42?"
    res = DeterministicIntentRouter.classify(query)

    assert res.primary_intent == "placement"
    assert "Placement" in res.recommended_agent
    assert "Google" in res.extracted_entities.companies
    assert res.extracted_entities.cgpa == 8.42


def test_finance_intent_classification():
    """Verify fee deadlines and fines route to Finance."""
    query = "What is the tuition fee due date, late fine slabs, and hostel mess rebate policy?"
    res = DeterministicIntentRouter.classify(query)

    assert res.primary_intent == "finance"
    assert "Financial" in res.recommended_agent


def test_compound_query_decomposition():
    """Verify compound queries detect both primary and secondary intents."""
    query = "Can I attend Microsoft recruitment drive if my CS601 attendance is 68%?"
    res = DeterministicIntentRouter.classify(query)

    assert res.is_compound_query is True
    assert len(res.secondary_intents) >= 1
    intents = [res.primary_intent] + [s["intent"] for s in res.secondary_intents]
    assert "placement" in intents
    assert "academic" in intents


def test_intent_classification_api_endpoint():
    """Verify POST /api/v1/ai/intent/classify REST endpoint."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/ai/intent/classify",
        headers=headers,
        json={"query": "Check eligibility for Microsoft placement drive with 8.42 CGPA"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["primary_intent"] == "placement"
    assert data["confidence"] > 0.60
    assert "Microsoft" in data["extracted_entities"]["companies"]
    assert data["extracted_entities"]["cgpa"] == 8.42
