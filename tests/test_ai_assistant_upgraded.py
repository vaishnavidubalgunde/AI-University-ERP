import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# pyrefly: ignore [missing-import]
from app.ai.rag.pdf_processor import PDFProcessor
# pyrefly: ignore [missing-import]
from app.ai.rag.chunker import SemanticChunker
# pyrefly: ignore [missing-import]
from app.ai.rag.vector_store import VectorStore
# pyrefly: ignore [missing-import]
from app.ai.question_router import QuestionRouter


class TestAIAssistantUpgraded(unittest.TestCase):
    def test_pdf_processor_text(self):
        sample_doc = b"""# University Academic Regulations 2026

## 1. Attendance Policy
Every student must maintain a minimum attendance of 75% in each registered course to be eligible for Semester End Examinations (SEE).
Condonation between 65% and 75% may be approved on valid certified medical grounds.

## 2. Examination Guidelines
The Semester End Examination schedule will commence on December 15th, 2026.
Students with NSAR status will be debarred from writing exams.

| Course Code | Minimum Attendance | Minimum CIE |
| CS601 | 75% | 20/50 |
| CS602 | 75% | 20/50 |
"""
        pages, meta = PDFProcessor.parse_document(sample_doc, "academic_regulations.txt")
        self.assertGreaterEqual(len(pages), 1)
        self.assertTrue(any(p.get("has_tables") for p in pages) or "Attendance" in pages[0]["text"])

        overview = PDFProcessor.generate_document_overview(pages, "academic_regulations.txt", meta)
        self.assertIn("summary_markdown", overview)
        self.assertTrue(len(overview["rules"]) > 0 or len(overview["sections"]) > 0)

    def test_semantic_chunker_page_preservation(self):
        chunker = SemanticChunker(chunk_size_words=50, overlap_words=10)
        pages = [
            {"page_number": 1, "text": "Page 1 intro regulations and general scope.", "headings": ["Intro"], "has_tables": False},
            {"page_number": 2, "text": "Page 2 attendance minimum requirement 75% mandatory.", "headings": ["Attendance"], "has_tables": True},
        ]
        chunks = chunker.chunk_pages(
            pages=pages,
            document_id=101,
            document_title="Regulations 2026",
            filename="regulations.pdf",
            user_id=1,
            is_public=True,
            category="Academic",
        )
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["page_number"], 1)
        self.assertEqual(chunks[1]["page_number"], 2)
        self.assertEqual(chunks[0]["document_id"], 101)

    def test_vector_store_isolation_and_filter(self):
        vs = VectorStore(index_path="./data/vector_store/test_index.json")
        chunks = [
            {
                "chunk_id": "doc1_p1",
                "document_id": 1,
                "document_title": "Doc 1",
                "filename": "doc1.pdf",
                "page_number": 1,
                "section_title": "Attendance",
                "text": "Attendance minimum requirement is 75 percent for semester end exams.",
                "user_id": 10,
                "is_public": False,
            },
            {
                "chunk_id": "doc2_p5",
                "document_id": 2,
                "document_title": "Doc 2",
                "filename": "doc2.pdf",
                "page_number": 5,
                "section_title": "Hostel",
                "text": "Hostel curfew is 09:30 PM with mess rebate on approved leave.",
                "user_id": 10,
                "is_public": False,
            },
        ]
        vs.add_chunks(chunks)

        # Search specifically for Doc 1
        results = vs.search(query="attendance", top_k=2, document_id=1)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["document_id"], 1)
        self.assertEqual(results[0]["page_number"], 1)

    def test_question_router_classification(self):
        # 1. General Conversation
        r, _ = QuestionRouter.classify_and_route("Hello there")
        self.assertEqual(r, "GENERAL_CONVERSATION")

        # 2. Personal ERP
        r, _ = QuestionRouter.classify_and_route("What is my attendance?")
        self.assertEqual(r, "PERSONAL_ERP")

        # 3. Mixed query
        r, _ = QuestionRouter.classify_and_route("What is my attendance compared to the university requirement?")
        self.assertEqual(r, "MIXED")

        # 4. PDF Document query
        r, _ = QuestionRouter.classify_and_route("Summarize chapter 3 in this document")
        self.assertEqual(r, "PDF_DOCUMENT")

        # 5. University Knowledge
        r, _ = QuestionRouter.classify_and_route("What is the university attendance requirement?")
        self.assertEqual(r, "UNIVERSITY_KNOWLEDGE")


if __name__ == "__main__":
    unittest.main()
