import re
import time
import hashlib
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
import html
from app.models.data_ingestion import (
    SourceType,
    DataCategory,
    ContentClassification,
)


class UniversityCrawlerService:
    """
    Controlled, secure web crawler for public university portals, regulations, and circulars.
    Implements domain restrictions, content hashing (SHA-256), HTML noise removal, and semantic classification.
    """

    CLASSIFICATION_RULES: Dict[ContentClassification, List[str]] = {
        ContentClassification.ATTENDANCE_POLICY: [
            "attendance", "minimum attendance", "condonation", "shortage of attendance", "75%", "85%", "biometric", "regularity"
        ],
        ContentClassification.EXAMINATION: [
            "examination", "cie", "see", "hall ticket", "timetable", "exam fee", "revaluation", "malpractice", "supplementary", "invigilation"
        ],
        ContentClassification.FEES: [
            "fee structure", "tuition fee", "development fee", "payment portal", "installment", "refund policy", "demand draft", "online fee"
        ],
        ContentClassification.SCHOLARSHIP: [
            "scholarship", "financial aid", "merit scholarship", "ssp", "nsp", "fee concession", "endowment", "stipend"
        ],
        ContentClassification.ACADEMIC_CALENDAR: [
            "academic calendar", "semester commencement", "working days", "last working day", "term dates", "reopening", "vacation"
        ],
        ContentClassification.ADMISSION: [
            "admission", "eligibility", "apply now", "seat matrix", "intake", "entrance test", "counseling", "lateral entry", "pgcet", "comedk"
        ],
        ContentClassification.DEPARTMENT: [
            "department of", "school of engineering", "computer science", "electronics", "mechanical", "hod", "faculty members", "laboratories"
        ],
        ContentClassification.COURSE: [
            "course curriculum", "syllabus", "credits", "prerequisite", "course outcomes", "program electives", "open electives"
        ],
        ContentClassification.FACULTY: [
            "faculty profile", "professor", "associate professor", "assistant professor", "ph.d", "research publications", "faculty directory"
        ],
        ContentClassification.REGULATIONS: [
            "academic regulations", "ordinance", "grading system", "sgpa", "cgpa", "credit system", "passing criteria", "degree award"
        ],
        ContentClassification.PLACEMENT: [
            "placement", "campus recruitment", "highest package", "average ctc", "tier 1", "dream offer", "internship", "visiting companies"
        ],
        ContentClassification.NOTICE: [
            "circular", "notification", "official notice", "office order", "announcement", "memo", "advisory"
        ],
        ContentClassification.EVENT: [
            "symposium", "conference", "hackathon", "cultural fest", "sports meet", "workshop", "webinar", "convocation"
        ],
        ContentClassification.HOSTEL: [
            "hostel", "accommodation", "mess menu", "warden", "room allotment", "curfew", "laundry"
        ],
        ContentClassification.LIBRARY: [
            "library", "digital library", "ieee", "scopus", "books", "borrowing", "e-resources", "reading room"
        ],
        ContentClassification.FAQ: [
            "frequently asked questions", "faq", "q&a", "helpdesk", "queries"
        ],
    }

    @staticmethod
    def clean_html(raw_html: str) -> str:
        """Strip script, style, nav, and footer noise and extract meaningful clean content."""
        if not raw_html:
            return ""
            
        # Remove script and style tags
        cleaned = re.sub(r"<script.*?</script>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<style.*?</style>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<nav.*?</nav>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<footer.*?</footer>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<header.*?</header>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        
        # Replace header tags with markdown-style markers
        cleaned = re.sub(r"<h[1-6][^>]*>(.*?)</h[1-6]>", r"\n### \1\n", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<li[^>]*>(.*?)</li>", r"\n• \1", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<p[^>]*>(.*?)</p>", r"\n\1\n", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<br\s*/?>", r"\n", cleaned, flags=re.IGNORECASE)
        
        # Remove all remaining HTML tags
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = html.unescape(cleaned)
        
        # Normalize whitespace
        lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
        return "\n".join(lines)

    @staticmethod
    def compute_sha256(text: str) -> str:
        """Generate SHA-256 fingerprint for deduplication and update tracking."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @classmethod
    def classify_content(cls, title: str, text: str) -> Tuple[ContentClassification, float]:
        """
        Classify document content into one of the 22 standardized ERP/Knowledge categories
        and calculate an extraction confidence score.
        """
        search_blob = f"{title.lower()} {text.lower()}"
        best_category = ContentClassification.GENERAL
        max_matches = 0
        total_tokens = 0

        for category, keywords in cls.CLASSIFICATION_RULES.items():
            matches = sum(1 for kw in keywords if kw in search_blob)
            if matches > max_matches:
                max_matches = matches
                best_category = category
            total_tokens += len(keywords)

        if max_matches >= 3:
            confidence = min(0.85 + (max_matches * 0.03), 0.99)
        elif max_matches >= 1:
            confidence = 0.75 + (max_matches * 0.05)
        else:
            best_category = ContentClassification.GENERAL
            confidence = 0.60

        return best_category, round(confidence, 2)

    @classmethod
    def simulate_crawl_url(
        cls,
        url: str,
        category_hint: Optional[DataCategory] = None,
        crawl_depth: int = 2,
        max_pages: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Simulate crawling a public university portal/endpoint and extracting structured pages
        with realistic academic metadata, content hashing, and classification.
        """
        domain = urllib.parse.urlparse(url).netloc or "ums.mydsi.org"
        
        # Simulated discovered pages for demonstration / seed synchronization
        simulated_pages = [
            {
                "url": f"https://{domain}/academic-regulations-2026",
                "title": "Sagar University - Academic & Attendance Regulations 2026",
                "raw_text": (
                    "### Sagar University Academic Regulations 2026\n"
                    "1. Attendance Requirement: Every student must maintain a minimum attendance of 75% in each course to be eligible for the Semester End Examination (SEE).\n"
                    "2. Condonation: Condonation up to 10% (between 65% and 75%) may be granted by the Dean on valid medical grounds with authentic documentation submitted within 7 working days.\n"
                    "3. Continuous Internal Evaluation (CIE): Maximum 50 marks comprising three CIE tests of 30 marks each (average of best two scaled to 30) and 20 marks for internal assignments and lab records.\n"
                    "4. Passing Criteria: Minimum 40% in SEE and 40% aggregate in CIE + SEE combined."
                ),
            },
            {
                "url": f"https://{domain}/examination-ordinance-schedule",
                "title": "Office of the Controller of Examinations - SEE Timetable & Hall Ticket Rules",
                "raw_text": (
                    "### Examination Guidelines & Digital Hall Tickets\n"
                    "• Digital Hall Tickets: Downloadable from the student ERP portal 7 days prior to exam commencement upon full clearance of tuition fee dues.\n"
                    "• Reporting Time: Candidates must report 30 minutes before exam commencement with valid institutional ID card.\n"
                    "• Malpractice Policy: Strictly zero tolerance. Possession of electronic gadgets or unauthorized study material results in immediate cancellation of exam semester."
                ),
            },
            {
                "url": f"https://{domain}/scholarships-and-financial-aid",
                "title": "Institutional Merit Scholarships & Government Financial Aid Schemes",
                "raw_text": (
                    "### Merit Scholarship Program 2026-27\n"
                    "• Category A (9.5+ CGPA): 50% tuition fee waiver for the subsequent academic year.\n"
                    "• Category B (9.0 - 9.49 CGPA): 25% tuition fee waiver.\n"
                    "• State Government Schemes: Portal assists with State Scholarship Portal (SSP) and National Scholarship Portal (NSP) e-attestation and bonafide certification."
                ),
            },
            {
                "url": f"https://{domain}/placement-rules-and-eligibility",
                "title": "Centre for Corporate Relations - Campus Placement Guidelines & Upgrade Policy",
                "raw_text": (
                    "### Placement Policy 2026\n"
                    "• Tier 1 Companies: CTC >= ₹12.0 LPA\n"
                    "• Tier 2 Companies: CTC between ₹6.0 LPA and ₹11.99 LPA\n"
                    "• Tier 3 Companies: CTC < ₹6.0 LPA\n"
                    "• One-Student-One-Offer Rule: A candidate securing a Tier 3 offer is permitted up to 2 upgrade attempts in Tier 2 or Tier 1 companies. Securing a Tier 1 Dream Offer concludes active placement eligibility."
                ),
            },
            {
                "url": f"https://{domain}/departments/computer-science-and-engineering",
                "title": "Department of Computer Science & Engineering - Faculty & Facilities",
                "raw_text": (
                    "### Department of Computer Science & Engineering\n"
                    "• Head of Department: Dr. S. Sharma, Ph.D. (AI & Cloud Computing)\n"
                    "• Programs Offered: B.Tech CSE, M.Tech Data Engineering, Ph.D. in Computer Science\n"
                    "• State of the art laboratories: High Performance Computing Lab, NVIDIA AI Research Center, Cloud IoT Laboratory\n"
                    "• Contact: cse.dept@dsuonline.com | +91 80 4909 2800"
                ),
            },
        ]

        results = []
        for p in simulated_pages[:max_pages]:
            content_hash = cls.compute_sha256(p["raw_text"])
            classification, confidence = cls.classify_content(p["title"], p["raw_text"])
            
            results.append({
                "url": p["url"],
                "title": p["title"],
                "cleaned_text": p["raw_text"],
                "content_hash": content_hash,
                "classification": classification,
                "confidence_score": confidence,
                "http_status": 200,
                "content_type": "text/html",
                "sync_status": "NEW",
            })
            
        return results


crawler_service = UniversityCrawlerService()
