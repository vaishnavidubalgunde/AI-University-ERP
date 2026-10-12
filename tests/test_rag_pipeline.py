import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.db.seed import seed_database
from app.ai.rag.parser import DocumentParser
from app.ai.rag.chunker import SemanticChunker
from app.ai.rag.vector_store import VectorStore
from app.ai.rag.ingest import ingest_knowledge_base

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure database is seeded and RAG index is generated."""
    seed_database()
    ingest_knowledge_base()


def get_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_document_parser_and_chunker():
    """Verify document parser and semantic chunker."""
    corpus_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "backend", "data", "knowledge_base")
    )
    academic_file = os.path.join(corpus_dir, "academic_regulations.md")
    assert os.path.exists(academic_file)

    parser = DocumentParser()
    parsed = parser.parse_file(academic_file)
    assert "Academic Regulations" in parsed["title"]
    assert len(parsed["sections"]) >= 4

    chunker = SemanticChunker(chunk_size_words=100, overlap_words=20)
    chunks = chunker.chunk_document(parsed)
    assert len(chunks) >= 4
    assert chunks[0]["document_title"] == parsed["title"]
    assert "chunk_" in chunks[0]["chunk_id"]


def test_vector_store_search():
    """Verify vector store similarity search returns relevant chunks with citations."""
    vs = VectorStore()
    assert vs.load_index() is True

    # Search for attendance condonation
    results = vs.search("What is the minimum attendance required and condonation rule?", top_k=2)
    assert len(results) >= 1
    top = results[0]
    assert "attendance" in top["text"].lower() or "75%" in top["text"]
    assert top["similarity_score"] > 0.1
    assert "Academic Regulations" in top["document_title"]


def test_rag_search_api_endpoint():
    """Verify GET /api/v1/ai/rag/search endpoint."""
    headers = get_auth_headers()
    res = client.get(
        "/api/v1/ai/rag/search",
        params={"query": "What are the rules for Dream and Super Dream placement offers?", "top_k": 3},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["results_count"] >= 1
    assert any("Placement Policy" in r["document_title"] for r in data["results"])


def test_rag_ingest_api_endpoint():
    """Verify POST /api/v1/ai/rag/ingest endpoint."""
    headers = get_auth_headers()
    res = client.post("/api/v1/ai/rag/ingest", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_documents"] >= 4
    assert data["total_chunks"] >= 15
