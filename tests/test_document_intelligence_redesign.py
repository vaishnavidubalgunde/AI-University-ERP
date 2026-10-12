import sys
import os
import io
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, get_db
from app.models.user import User, UserRole
from app.models.ai import Document, DocumentChunk, DocumentComparison
from app.ai.rag.pdf_processor import PDFProcessor
from app.ai.rag.document_comparator import DocumentComparator
from app.ai.question_router import QuestionRouter
from app.ai.rag.vector_store import VectorStore
from app.db.seed import seed_database
from app.ai.rag.ingest import ingest_knowledge_base

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database()
    ingest_knowledge_base()

def get_auth_headers() -> dict:
    """Helper to obtain student JWT Bearer header."""
    res = client.post("/api/v1/auth/login", json={"email": "alex.kumar@univ.edu", "password": "student123"})
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestDocumentIntelligenceRedesign:
    def test_pdf_processor_complete_intelligence(self):
        """Verify full page-by-page extraction, rule/date detection, and structured tables."""
        mock_pdf_content = (
            "ACADEMIC REGULATIONS 2025\n"
            "Section 1: Attendance\n"
            "Every student must maintain at least 80% attendance in each course.\n"
            "A minimum of 75% attendance is required to appear for SEE examinations.\n"
            "Section 2: Important Dates\n"
            "The Odd semester commences on August 1st, 2025.\n"
            "The last working day is November 28th, 2025.\n"
            "Section 3: Eligibility & Grading\n"
            "To be eligible for honors degree, a student must secure CGPA >= 8.5 with zero backlogs.\n"
            "Amendment: The minimum attendance is revised from 75% to 80%."
        ).encode("utf-8")

        result_pages, result_meta = PDFProcessor.extract_document(mock_pdf_content, filename="regulations_2025.txt")
        assert len(result_pages) >= 1
        assert result_meta["total_pages"] >= 1

        analysis = PDFProcessor.generate_complete_document_intelligence(
            pages=result_pages,
            metadata=result_meta,
            filename="regulations_2025.txt",
        )

        assert "Regulations" in analysis["title"]
        assert len(analysis["important_rules"]) > 0
        rule_texts = [getattr(r, "text", r.get("text", "") if isinstance(r, dict) else "") for r in analysis["important_rules"]]
        assert any("80%" in t or "attendance" in t.lower() for t in rule_texts)
        assert len(analysis["important_dates"]) > 0
        assert analysis["executive_summary"] != ""

    def test_document_comparator_dual_versions(self):
        """Verify structural diffing, table matrix, and change summaries between two editions."""
        doc_2024_analysis = {
            "title": "Regulations 2024",
            "academic_year": "2024-25",
            "document_structure": ["1. Attendance Requirements", "2. Examination Grading"],
            "important_rules": [
                {"text": "Students must maintain minimum 75% attendance.", "page_number": 1, "section": "Attendance"}
            ],
            "important_dates": [
                {"text": "Classes commence on August 10, 2024", "page_number": 2, "section": "Calendar"}
            ],
            "eligibility_requirements": [
                {"text": "Honors degree requires CGPA of 8.0.", "page_number": 3, "section": "Eligibility"}
            ],
            "extracted_tables": [],
        }

        doc_2025_analysis = {
            "title": "Regulations 2025",
            "academic_year": "2025-26",
            "document_structure": ["1. Attendance Requirements", "2. Examination Grading", "3. Industry Internship"],
            "important_rules": [
                {"text": "Students must maintain minimum 80% attendance.", "page_number": 1, "section": "Attendance"}
            ],
            "important_dates": [
                {"text": "Classes commence on August 1, 2025", "page_number": 2, "section": "Calendar"}
            ],
            "eligibility_requirements": [
                {"text": "Honors degree requires CGPA of 8.5.", "page_number": 3, "section": "Eligibility"}
            ],
            "extracted_tables": [],
        }

        diff = DocumentComparator.compare_documents(
            doc_a_data={"id": 1, "title": "Regulations 2024", "version": "2024", "analysis": doc_2024_analysis},
            doc_b_data={"id": 2, "title": "Regulations 2025", "version": "2025", "analysis": doc_2025_analysis},
        )

        assert not diff["is_identical"]
        assert len(diff["summary_of_major_changes"]) > 0
        assert len(diff["comparison_matrix"]) > 0
        assert len(diff["new_items"]) >= 1  # Industry Internship

    def test_document_analysis_and_compare_endpoints(self):
        """Verify API endpoints for analysis retrieval, pages inspection, and document comparison."""
        headers = get_auth_headers()

        # Upload Doc A
        file_a = io.BytesIO(b"REGULATIONS 2024: Minimum attendance is 75%. Fee deadline is August 10.")
        res_a = client.post(
            "/api/v1/ai/documents/upload",
            headers=headers,
            files={"file": ("reg_2024.txt", file_a, "text/plain")},
            data={"title": "Academic Regulations 2024", "category": "Academic Regulations"},
        )
        assert res_a.status_code == 200
        doc_a_id = res_a.json()["doc_id"]

        # Upload Doc B
        file_b = io.BytesIO(b"REGULATIONS 2025: Minimum attendance is revised to 80%. Fee deadline is August 1.")
        res_b = client.post(
            "/api/v1/ai/documents/upload",
            headers=headers,
            files={"file": ("reg_2025.txt", file_b, "text/plain")},
            data={"title": "Academic Regulations 2025", "category": "Academic Regulations"},
        )
        assert res_b.status_code == 200
        doc_b_id = res_b.json()["doc_id"]

        # 1. Test Analysis Endpoint
        analysis_res = client.get(f"/api/v1/ai/documents/{doc_b_id}/analysis", headers=headers)
        assert analysis_res.status_code == 200
        analysis_data = analysis_res.json()
        assert analysis_data["title"] == "Academic Regulations 2025"
        assert "summary_markdown" in analysis_data

        # 2. Test Pages Endpoint
        pages_res = client.get(f"/api/v1/ai/documents/{doc_b_id}/pages", headers=headers)
        assert pages_res.status_code == 200
        pages_data = pages_res.json()
        assert len(pages_data) >= 1
        assert pages_data[0]["page_number"] == 1

        # 3. Test Compare Endpoint
        compare_res = client.post(
            "/api/v1/ai/documents/compare",
            headers=headers,
            json={"doc_a_id": doc_a_id, "doc_b_id": doc_b_id},
        )
        assert compare_res.status_code == 200
        comp_data = compare_res.json()
        assert comp_data["doc_a_id"] == doc_a_id
        assert comp_data["doc_b_id"] == doc_b_id
        assert len(comp_data["comparison_matrix"]) > 0

    def test_conversational_change_query(self):
        """Verify natural language change queries route correctly to document context."""
        headers = get_auth_headers()
        res = client.post(
            "/api/v1/ai/chat",
            headers=headers,
            json={"message": "What is my exam schedule and hall ticket status?"},
        )
        assert res.status_code == 200
        data = res.json()
        ai_msg = data["ai_message"]
        assert ai_msg["sender"] == "ai_agent"
        assert "Digital Hall Ticket" in ai_msg["content"] or "Examination" in ai_msg["content"]
