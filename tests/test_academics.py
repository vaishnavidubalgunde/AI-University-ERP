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


def test_get_courses():
    """Verify courses endpoint returns all enrolled and department subjects."""
    headers = get_auth_headers()
    res = client.get("/api/v1/academics/courses", headers=headers)
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 6
    codes = [c["code"] for c in courses]
    assert "CS601" in codes
    assert "CS602" in codes


def test_get_attendance_details():
    """Verify granular attendance metrics and calculations."""
    headers = get_auth_headers()
    res = client.get("/api/v1/academics/attendance", headers=headers)
    assert res.status_code == 200
    attendance = res.json()
    assert len(attendance) >= 5

    # Test CS601 safe status
    cs601 = next((a for a in attendance if a["course_code"] == "CS601"), None)
    assert cs601 is not None
    assert cs601["percentage"] >= 88.0
    assert cs601["status"] == "safe"
    assert cs601["max_classes_can_miss_for_75"] >= 1

    # Test CS602 shortage status
    cs602 = next((a for a in attendance if a["course_code"] == "CS602"), None)
    assert cs602 is not None
    assert cs602["is_shortage"] is True
    assert cs602["status"] == "shortage"
    assert cs602["classes_needed_for_75"] >= 5


def test_get_internal_marks():
    """Verify internal assessment marks breakdown per course."""
    headers = get_auth_headers()
    res = client.get("/api/v1/academics/marks", headers=headers)
    assert res.status_code == 200
    marks = res.json()
    assert len(marks) >= 5
    for c in marks:
        assert c["total_max_marks"] > 0
        assert c["total_obtained_marks"] <= c["total_max_marks"]
        assert c["projected_grade"] is not None


def test_get_academic_transcript():
    """Verify full semester academic transcript and SGPA/CGPA calculations."""
    headers = get_auth_headers()
    res = client.get("/api/v1/academics/transcript", headers=headers)
    assert res.status_code == 200
    transcript = res.json()
    assert transcript["cgpa"] >= 9.0
    assert transcript["total_credits_earned"] >= 120
    assert len(transcript["semesters"]) == 6


def test_get_and_register_electives():
    """Verify available electives and registration flow."""
    headers = get_auth_headers()
    res = client.get("/api/v1/academics/electives", headers=headers)
    assert res.status_code == 200
    electives = res.json()
    assert len(electives) >= 2

    # Register for elective
    target_elective = electives[0]
    reg_res = client.post(
        "/api/v1/academics/electives/register",
        headers=headers,
        json={"course_id": target_elective["id"]},
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["enrolled"] is True
