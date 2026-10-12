import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.kumar@univ.edu", "password": "student123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_weekly_academic_briefing(client, auth_headers):
    response = client.get("/api/v1/ai/analytics/briefing", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "student_name" in data
    assert "briefing_markdown" in data
    assert "highlights" in data
    assert "urgent_actions" in data
    assert isinstance(data["upcoming_exams"], list)


def test_get_student_risk_radar(client, auth_headers):
    response = client.get("/api/v1/ai/analytics/risk-radar", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "overall_risk_level" in data
    assert "risk_score" in data
    assert data["overall_risk_level"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")
    assert "at_risk_courses" in data


def test_get_smart_study_schedule(client, auth_headers):
    response = client.get("/api/v1/ai/analytics/study-schedule", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_study_days" in data
    assert "study_sessions" in data
    assert "schedule_markdown" in data
