import re
import uuid
from typing import List, Dict, Any, Optional


class SemanticChunker:
    """
    Intelligent semantic chunker preserving page boundaries, section titles,
    document metadata, and structured tables.
    """

    def __init__(self, chunk_size_words: int = 140, overlap_words: int = 25):
        self.chunk_size_words = chunk_size_words
        self.overlap_words = overlap_words

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: int,
        document_title: str,
        filename: str,
        user_id: int,
        is_public: bool = False,
        category: str = "General",
    ) -> List[Dict[str, Any]]:
        """
        Chunk a list of extracted document pages preserving page numbers and section headers.
        """
        chunks = []
        chunk_counter = 1

        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"]
            headings = page.get("headings", [])
            has_tables = page.get("has_tables", False)

            # Determine primary section title for this page
            primary_sec = headings[0] if headings else f"Page {page_num}"

            # Split into paragraph blocks
            paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]
            if not paragraphs:
                continue

            # Process each paragraph or slide window over words
            page_words = page_text.split()

            if len(page_words) <= self.chunk_size_words:
                chunks.append({
                    "chunk_id": f"doc_{document_id}_p{page_num}_{chunk_counter:03d}",
                    "chunk_uuid": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "document_title": document_title,
                    "filename": filename,
                    "page_number": page_num,
                    "section_title": primary_sec,
                    "text": page_text,
                    "word_count": len(page_words),
                    "has_table": has_tables,
                    "user_id": user_id,
                    "is_public": is_public,
                    "category": category,
                    "citation": f"{document_title} (Page {page_num})",
                })
                chunk_counter += 1
                continue

            # Sliding window over page words
            start_idx = 0
            while start_idx < len(page_words):
                end_idx = min(start_idx + self.chunk_size_words, len(page_words))
                chunk_words = page_words[start_idx:end_idx]
                chunk_text = " ".join(chunk_words)

                chunks.append({
                    "chunk_id": f"doc_{document_id}_p{page_num}_{chunk_counter:03d}",
                    "chunk_uuid": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "document_title": document_title,
                    "filename": filename,
                    "page_number": page_num,
                    "section_title": primary_sec,
                    "text": chunk_text,
                    "word_count": len(chunk_words),
                    "has_table": has_tables,
                    "user_id": user_id,
                    "is_public": is_public,
                    "category": category,
                    "citation": f"{document_title} (Page {page_num})",
                })
                chunk_counter += 1

                if end_idx >= len(page_words):
                    break
                start_idx += self.chunk_size_words - self.overlap_words

        return chunks

    def chunk_document(self, parsed_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Legacy helper for backward compatibility with knowledge base markdown files."""
        chunks = []
        doc_title = parsed_doc["title"]
        filename = parsed_doc["filename"]

        chunk_counter = 1
        for section in parsed_doc.get("sections", []):
            sec_title = section["section_title"]
            text = section["text"]
            words = text.split()

            if len(words) <= self.chunk_size_words:
                chunks.append({
                    "chunk_id": f"{filename}#chunk_{chunk_counter:03d}",
                    "chunk_uuid": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": 0,
                    "document_title": doc_title,
                    "filename": filename,
                    "page_number": 1,
                    "section_title": sec_title,
                    "text": text,
                    "word_count": len(words),
                    "has_table": False,
                    "user_id": 0,
                    "is_public": True,
                    "category": "University Regulations",
                    "citation": f"{doc_title} ({sec_title})",
                })
                chunk_counter += 1
                continue

            start_idx = 0
            while start_idx < len(words):
                end_idx = min(start_idx + self.chunk_size_words, len(words))
                chunk_words = words[start_idx:end_idx]
                chunk_text = " ".join(chunk_words)

                chunks.append({
                    "chunk_id": f"{filename}#chunk_{chunk_counter:03d}",
                    "chunk_uuid": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": 0,
                    "document_title": doc_title,
                    "filename": filename,
                    "page_number": 1,
                    "section_title": sec_title,
                    "text": chunk_text,
                    "word_count": len(chunk_words),
                    "has_table": False,
                    "user_id": 0,
                    "is_public": True,
                    "category": "University Regulations",
                    "citation": f"{doc_title} ({sec_title})",
                })
                chunk_counter += 1

                if end_idx >= len(words):
                    break
                start_idx += self.chunk_size_words - self.overlap_words

        return chunks
