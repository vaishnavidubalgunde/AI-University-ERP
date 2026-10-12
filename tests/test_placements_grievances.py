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


def test_get_placement_drives():
    """Verify placement drives listing with eligibility computed."""
    headers = get_auth_headers()
    res = client.get("/api/v1/placements/drives", headers=headers)
    assert res.status_code == 200
    drives = res.json()
    assert len(drives) >= 3
    companies = [d["company_name"] for d in drives]
    assert "Google India" in companies


def test_apply_to_placement_drive():
    """Verify 1-click application submission to a drive."""
    headers = get_auth_headers()
    drives_res = client.get("/api/v1/placements/drives", headers=headers)
    assert drives_res.status_code == 200
    drive = drives_res.json()[0]

    apply_res = client.post(
        "/api/v1/placements/apply",
        headers=headers,
        json={"drive_id": drive["id"]},
    )
    assert apply_res.status_code == 200
    data = apply_res.json()
    assert data["success"] is True
    assert "status" in data


def test_get_my_applications():
    """Verify listing student's active placement applications."""
    headers = get_auth_headers()
    res = client.get("/api/v1/placements/my-applications", headers=headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 1
    assert "company_name" in apps[0]


def test_get_and_submit_grievances():
    """Verify grievance ticketing: listing and creating a new ticket."""
    headers = get_auth_headers()

    # Get list
    res_list = client.get("/api/v1/grievances", headers=headers)
    assert res_list.status_code == 200
    grievances = res_list.json()
    assert len(grievances) >= 1

    # Submit new ticket
    create_res = client.post(
        "/api/v1/grievances",
        headers=headers,
        json={
            "subject": "Wi-Fi Connectivity issues in CSE Lab 3",
            "description": "The 5GHz access point has been dropping connections during the Distributed Systems practical.",
            "category": "infrastructure",
            "priority": "normal",
        },
    )
    assert create_res.status_code == 200
    ticket = create_res.json()
    assert ticket["success"] is True
    assert "GRV-2026" in ticket["ticket_number"]
