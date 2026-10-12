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


def test_get_fee_summary():
    """Verify fee summary endpoint returns balance and itemized records."""
    headers = get_auth_headers()
    res = client.get("/api/v1/finance/fees", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_name"] == "Alex Kumar"
    assert data["total_fee"] > 0
    assert len(data["records"]) >= 1


def test_fee_payment_simulation():
    """Verify paying fee installment updates balance and produces receipt."""
    headers = get_auth_headers()
    fee_res = client.get("/api/v1/finance/fees", headers=headers)
    assert fee_res.status_code == 200
    record = fee_res.json()["records"][0]

    if record["balance_due"] > 0:
        pay_res = client.post(
            "/api/v1/finance/pay",
            headers=headers,
            json={
                "fee_record_id": record["id"],
                "amount": 5000.0,
                "payment_method": "UPI",
            },
        )
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        assert pay_data["success"] is True
        assert "REC-2026" in pay_data["receipt_number"]
        assert pay_data["amount_paid"] == 5000.0


def test_get_official_documents():
    """Verify document repository returns Bonafide and Grade cards."""
    headers = get_auth_headers()
    res = client.get("/api/v1/finance/documents", headers=headers)
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 3
    doc_ids = [d["id"] for d in docs]
    assert "bonafide-cert" in doc_ids


def test_request_official_document():
    """Verify digital document request endpoint."""
    headers = get_auth_headers()
    res = client.post(
        "/api/v1/finance/documents/request",
        headers=headers,
        json={"document_id": "bonafide-cert", "purpose": "Passport Verification"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "DOC-REQ" in data["request_id"]
    assert data["status"] == "ISSUED_DIGITALLY"


def test_get_notices_and_filter():
    """Verify notices feed with category and search filter."""
    headers = get_auth_headers()
    res = client.get("/api/v1/notices", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 3
    assert len(data["notices"]) >= 3

    # Filter by academic category
    res_filtered = client.get("/api/v1/notices?category=academic", headers=headers)
    assert res_filtered.status_code == 200
    assert len(res_filtered.json()["notices"]) >= 1
