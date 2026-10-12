# pyrefly: ignore [missing-import]
import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "AI-Integrated University Student Support ERP" in data["title"]


def test_api_health_endpoint():
    """Verify /api/health endpoint contract."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data


def test_api_v1_health_endpoint():
    """Verify /api/v1/health endpoint alias."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
