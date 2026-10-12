import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.seed import seed_database
from app.ai.rag.ingest import ingest_knowledge_base

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure fresh database and RAG index are available."""
    seed_database()
    ingest_knowledge_base()


def get_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_chat_sessions():
    """Verify chat session creation and listing."""
    headers = get_auth_headers()

    # Create session
    create_res = client.post("/api/v1/ai/sessions", params={"title": "Academic Strategy Session"}, headers=headers)
    assert create_res.status_code == 200
    session_data = create_res.json()
    assert "sess_" in session_data["session_uuid"]

    # List sessions
    list_res = client.get("/api/v1/ai/sessions", headers=headers)
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert len(sessions) >= 1
    assert any(s["session_uuid"] == session_data["session_uuid"] for s in sessions)


def test_send_chat_message_with_rag_citations():
    """Verify sending a chat message performs RAG vector lookup and persists conversation."""
    headers = get_auth_headers()

    res = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={
            "message": "What is the condonation policy if my attendance is 68%?",
            "agent_type": "academic",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "session_uuid" in data
    assert data["user_message"]["sender"] == "user"
    assert data["ai_message"]["sender"] == "ai_agent"
    assert "Academic" in data["ai_message"]["agent_name"]
    assert "75%" in data["ai_message"]["content"]
    assert data["ai_message"]["sources"] is not None
    assert len(data["ai_message"]["sources"]) >= 1


def test_session_message_history():
    """Verify retrieving message history for an active session."""
    headers = get_auth_headers()

    # Send message in new session
    msg_res = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"message": "Can I participate in Super Dream placement drives with an 8.42 CGPA?"},
    )
    assert msg_res.status_code == 200
    sess_uuid = msg_res.json()["session_uuid"]

    # Fetch history
    hist_res = client.get(f"/api/v1/ai/sessions/{sess_uuid}/messages", headers=headers)
    assert hist_res.status_code == 200
    messages = hist_res.json()
    assert len(messages) >= 2  # user + AI
    assert messages[0]["sender"] == "user"
    assert messages[1]["sender"] == "ai_agent"
