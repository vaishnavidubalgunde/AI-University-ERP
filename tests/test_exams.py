import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure database has fresh university dataset."""
    seed_database()


def get_auth_headers(email: str = "alex.kumar@univ.edu", password: str = "student123") -> dict:
    """Helper to obtain JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_weekly_timetable():
    """Verify weekly timetable returns 6 days with slots."""
    headers = get_auth_headers()
    res = client.get("/api/v1/exams/timetable/weekly", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["days"]) == 6
    day_names = [d["day"] for d in data["days"]]
    assert "Monday" in day_names
    assert "Friday" in day_names


def test_get_exam_schedules():
    """Verify examination schedules return dates, rooms, and seat allocations."""
    headers = get_auth_headers()
    res = client.get("/api/v1/exams/schedules", headers=headers)
    assert res.status_code == 200
    schedules = res.json()
    assert len(schedules) >= 5
    for s in schedules:
        assert s["exam_date"] is not None
        assert s["room_number"] is not None
        assert s["seat_number"] is not None


def test_get_exam_eligibility_audit():
    """Verify deterministic eligibility engine evaluation."""
    headers = get_auth_headers()
    res = client.get("/api/v1/exams/eligibility", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_name"] == "Alex Kumar"
    assert "fee_clearance" in data
    assert "attendance_clearance" in data
    assert len(data["course_eligibilities"]) >= 5

    # Check CS602 shortage reflection in eligibility
    cs602_el = next((c for c in data["course_eligibilities"] if c["course_code"] == "CS602"), None)
    assert cs602_el is not None
    assert cs602_el["is_eligible"] is False
    assert "below 75%" in cs602_el["reason"]


def test_get_digital_hall_ticket():
    """Verify digital hall ticket payload with QR token."""
    headers = get_auth_headers()
    res = client.get("/api/v1/exams/hall-ticket", headers=headers)
    assert res.status_code == 200
    ticket = res.json()
    assert ticket["student_name"] == "Alex Kumar"
    assert ticket["qr_token"] is not None
    assert len(ticket["courses"]) >= 5
    assert len(ticket["instructions"]) >= 4
