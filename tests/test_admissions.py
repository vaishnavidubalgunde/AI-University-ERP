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


def test_portal_info():
    """Verify university public portal information endpoint."""
    response = client.get("/api/v1/admissions/portal-info")
    assert response.status_code == 200
    data = response.json()
    assert data["university_name"] == "SAGAR UNIVERSITY"
    assert "July 2026 Batch" in data["academic_batch"]
    assert len(data["programs_offered"]) >= 5
    assert data["helpline_phone"] == "+91 9880147004"


def test_apply_admission_enquiry():
    """Verify data collection from admission enquiry application."""
    payload = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@example.com",
        "phone": "+91 9876543210",
        "program": "MCA",
        "previous_qualification": "BCA - 2025",
        "percentage": 82.5,
        "state": "Karnataka",
        "city": "Bengaluru",
        "query_notes": "Interested in AI & Data Engineering specialization",
    }
    response = client.post("/api/v1/admissions/apply", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Rohan Sharma"
    assert data["program"] == "MCA"
    assert data["status"] == "Pending Counselor Callback"
    assert "id" in data


def test_login_with_usn():
    """Verify student can login with USN / Student ID."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "1DT23CS238", "password": "student123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["student_id"] == "1DT23CS238"


def test_otp_login_flow():
    """Verify OTP generation and login verification flow."""
    # Request OTP
    req_resp = client.post(
        "/api/v1/auth/request-otp",
        json={"identifier": "alex.kumar@univ.edu"},
    )
    assert req_resp.status_code == 200
    req_data = req_resp.json()
    assert req_data["success"] is True
    demo_otp = req_data["demo_otp"]

    # Verify OTP
    verify_resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"identifier": "alex.kumar@univ.edu", "otp_code": demo_otp},
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert "token" in verify_data
    assert verify_data["user"]["email"] == "alex.kumar@univ.edu"


def test_forgot_password():
    """Verify forgot password request."""
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": "alex.kumar@univ.edu"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
