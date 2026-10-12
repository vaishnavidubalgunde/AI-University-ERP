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


def get_admin_auth_headers() -> dict:
    """Helper to obtain admin JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "admin@univ.edu", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_student_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_stats_authorized():
    """Verify admin stats endpoint returns executive metrics."""
    headers = get_admin_auth_headers()
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_students"] >= 1
    assert data["total_courses"] >= 1
    assert "fee_collection_rate" in data


def test_admin_stats_unauthorized_for_student():
    """Verify RBAC: student cannot access admin stats."""
    headers = get_student_auth_headers()
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 403


def test_student_registry_and_enrollment():
    """Verify student registry listing and new student enrollment."""
    headers = get_admin_auth_headers()

    # List students
    res = client.get("/api/v1/admin/students", headers=headers)
    assert res.status_code == 200
    students = res.json()
    assert len(students) >= 1

    # Enroll new student
    enroll_res = client.post(
        "/api/v1/admin/students",
        headers=headers,
        json={
            "full_name": "Rohan Sharma",
            "email": "rohan.sharma@univ.edu",
            "student_id": "1DT23CS099",
            "department": "Computer Science & Engineering",
            "semester": 4,
            "cgpa": 9.15,
        },
    )
    assert enroll_res.status_code == 200
    assert enroll_res.json()["success"] is True


def test_rag_documents_and_reindex():
    """Verify knowledge base document listing, upload, and vector reindexing."""
    headers = get_admin_auth_headers()

    # List documents
    res_docs = client.get("/api/v1/admin/documents", headers=headers)
    assert res_docs.status_code == 200
    docs = res_docs.json()
    assert len(docs) >= 3

    # Upload document
    upload_res = client.post(
        "/api/v1/admin/documents/upload",
        headers=headers,
        json={
            "title": "Autonomous AI Lab Safety Guidelines",
            "category": "Lab Policy",
            "filename": "ai_lab_guidelines.md",
            "content": "All students working with autonomous agents must verify API limits and GPU heat dissipation rules before long-running workflows.",
        },
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["success"] is True

    # Trigger reindexing
    reindex_res = client.post("/api/v1/admin/rag/reindex", headers=headers)
    assert reindex_res.status_code == 200
    assert reindex_res.json()["success"] is True
    assert reindex_res.json()["total_vectors_indexed"] > 0
