import os
import re
import io
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, List, Any


class DocumentParser:
    """
    Parses Markdown, Text, PDF, DOCX, and CSV files into structured sections with metadata.
    Supports both file paths and in-memory byte streams from HTTP multipart uploads.
    """

    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """Extract text from PDF using pypdf."""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages_text = []
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"## Page {idx + 1}\n{text.strip()}")
            return "\n\n".join(pages_text) if pages_text else "Empty PDF content."
        except Exception as e:
            return f"[PDF Parsing Error: {str(e)}]"

    @staticmethod
    def extract_text_from_docx(docx_bytes: bytes) -> str:
        """Extract text paragraphs from DOCX OpenXML zip payload without third-party dependencies."""
        try:
            with zipfile.ZipFile(io.BytesIO(docx_bytes)) as docx_zip:
                xml_content = docx_zip.read("word/document.xml")
                root = ET.fromstring(xml_content)
                # Namespaces
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in root.findall(".//w:p", namespaces):
                    texts = [node.text for node in p.findall(".//w:t", namespaces) if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                return "\n\n".join(paragraphs) if paragraphs else "Empty DOCX content."
        except Exception as e:
            return f"[DOCX Parsing Error: {str(e)}]"

    @classmethod
    def parse_bytes(cls, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Parse raw uploaded file bytes based on extension."""
        ext = os.path.splitext(filename)[1].lower()
        title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()

        if ext == ".pdf":
            content = cls.extract_text_from_pdf(file_bytes)
        elif ext in (".docx", ".doc"):
            content = cls.extract_text_from_docx(file_bytes)
        else:
            try:
                content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = file_bytes.decode("latin-1", errors="ignore")

        return cls._structure_content(content, filename, title)

    @classmethod
    def parse_file(cls, file_path: str) -> Dict[str, Any]:
        """Parse file from local disk."""
        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()

        if ext in (".pdf", ".docx", ".doc"):
            with open(file_path, "rb") as f:
                return cls.parse_bytes(f.read(), filename)

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()
        return cls._structure_content(content, filename, title, file_path=file_path)

    @staticmethod
    def _structure_content(content: str, filename: str, title: str, file_path: str = "") -> Dict[str, Any]:
        """Internal helper to split text into header sections."""
        # Extract title from first H1 if present
        h1_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if h1_match:
            title = h1_match.group(1).strip()

        # Parse sections based on markdown headers (## or ###) or double linebreaks
        sections = []
        raw_sections = re.split(r"(?=^##\s+)", content, flags=re.MULTILINE)

        for sec in raw_sections:
            sec = sec.strip()
            if not sec:
                continue

            sec_title = "General Overview"
            sec_header_match = re.match(r"^##\s+(.+)$", sec, re.MULTILINE)
            if sec_header_match:
                sec_title = sec_header_match.group(1).strip()

            sections.append({
                "section_title": sec_title,
                "text": sec,
            })

        if not sections:
            # Chunk large continuous text by paragraph blocks
            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            for idx, p in enumerate(paragraphs):
                sections.append({
                    "section_title": f"Section {idx + 1}",
                    "text": p,
                })

        return {
            "filename": filename,
            "title": title,
            "file_path": file_path or filename,
            "raw_content": content,
            "sections": sections if sections else [{"section_title": "Overview", "text": content}],
        }
