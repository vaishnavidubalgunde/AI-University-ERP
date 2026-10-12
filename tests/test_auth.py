import sys
import os
# pyrefly: ignore [missing-import]
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from app.main import app

client = TestClient(app)


def test_seed_demo_users():
    """Verify demo users seed endpoint."""
    response = client.post("/api/v1/auth/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Demo users seeded successfully"
    assert data["total_users"] >= 3


def test_student_login_success():
    """Verify student login with valid credentials."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.kumar@univ.edu", "password": "student123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "access_token" in data["token"]
    assert data["token"]["token_type"] == "bearer"
    assert data["user"]["email"] == "alex.kumar@univ.edu"
    assert data["user"]["role"] == "student"
    assert data["user"]["student_id"] == "1DT23CS238"


def test_login_invalid_password():
    """Verify 401 on wrong password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.kumar@univ.edu", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"]


def test_get_current_user_me():
    """Verify /auth/me returns profile for authenticated bearer token."""
    # Login first
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.kumar@univ.edu", "password": "student123"},
    )
    token = login_resp.json()["token"]["access_token"]

    # Access /auth/me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["full_name"] == "Alex Kumar"
    assert user_data["role"] == "student"


def test_get_me_unauthorized():
    """Verify /auth/me rejects unauthenticated requests."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_token_refresh():
    """Verify /auth/refresh returns a new token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.kumar@univ.edu", "password": "student123"},
    )
    token = login_resp.json()["token"]["access_token"]

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_and_faculty_logins():
    """Verify faculty and admin credentials."""
    # Faculty
    faculty_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "dr.sharma@univ.edu", "password": "faculty123"},
    )
    assert faculty_resp.status_code == 200
    assert faculty_resp.json()["user"]["role"] == "faculty"

    # Admin
    admin_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@univ.edu", "password": "admin123"},
    )
    assert admin_resp.status_code == 200
    assert admin_resp.json()["user"]["role"] == "admin"
