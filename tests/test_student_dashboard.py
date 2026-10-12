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


def get_auth_headers(email: str, password: str) -> dict:
    """Helper to obtain JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_student_dashboard_authenticated():
    """Verify student dashboard returns metrics, attendance, schedule, and insights."""
    headers = get_auth_headers("alex.kumar@univ.edu", "student123")
    res = client.get("/api/v1/student/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Student metadata
    assert data["student_name"] == "Alex Kumar"
    assert data["student_id"] == "1DT23CS238"
    assert data["cgpa"] >= 9.0
    assert data["semester"] == 6

    # Attendance calculations
    assert "courses_attendance" in data
    assert len(data["courses_attendance"]) >= 5
    cs602 = next((c for c in data["courses_attendance"] if c["course_code"] == "CS602"), None)
    assert cs602 is not None
    assert cs602["is_shortage"] is True
    assert cs602["classes_needed_for_75"] >= 5

    # Today's schedule
    assert len(data["today_schedule"]) >= 4

    # Upcoming examinations
    assert len(data["upcoming_exams"]) >= 4

    # Notices
    assert len(data["recent_notices"]) >= 4

    # AI Insights
    assert len(data["ai_insights"]) >= 1
    shortage_insight = next((i for i in data["ai_insights"] if "Shortage" in i["title"]), None)
    assert shortage_insight is not None


def test_student_dashboard_unauthorized():
    """Verify unauthenticated request is rejected."""
    res = client.get("/api/v1/student/dashboard")
    assert res.status_code == 401
