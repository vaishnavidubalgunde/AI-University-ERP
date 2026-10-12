import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ExtractedEntities:
    course_codes: List[str] = field(default_factory=list)
    companies: List[str] = field(default_factory=list)
    percentages: List[str] = field(default_factory=list)
    semesters: List[int] = field(default_factory=list)
    cgpa: Optional[float] = None
    dates: List[str] = field(default_factory=list)


@dataclass
class IntentClassificationResult:
    query: str
    primary_intent: str
    confidence: float
    secondary_intents: List[Dict[str, Any]]
    is_compound_query: bool
    recommended_agent: str
    extracted_entities: ExtractedEntities


class DeterministicIntentRouter:
    """
    High-precision, deterministic intent router and entity extractor for University ERP.
    Guarantees zero hallucination in query routing across Academic, Exam, Placement, Finance, and Grievance agents.
    """

    INTENT_KEYWORDS: Dict[str, Dict[str, float]] = {
        "academic": {
            "attendance": 2.5,
            "attend": 2.0,
            "absent": 2.0,
            "present": 1.5,
            "shortage": 2.5,
            "condonation": 3.0,
            "medical condonation": 3.5,
            "cie": 2.5,
            "internal": 2.0,
            "marks": 1.8,
            "assessment": 1.5,
            "credit": 2.0,
            "credits": 2.0,
            "syllabus": 2.5,
            "curriculum": 2.0,
            "grade": 1.8,
            "sgpa": 2.5,
            "cgpa": 1.5,
            "transcript": 2.0,
            "elective": 2.5,
            "faculty": 1.5,
            "professor": 1.5,
        },
        "examination": {
            "exam": 2.5,
            "examination": 2.5,
            "see": 2.5,
            "timetable": 2.5,
            "schedule": 2.0,
            "hall ticket": 3.5,
            "hallticket": 3.5,
            "admit card": 3.0,
            "qr code": 2.5,
            "seating": 2.5,
            "seat": 2.0,
            "room": 1.5,
            "block": 1.5,
            "re-evaluation": 3.0,
            "reevaluation": 3.0,
            "makeup exam": 3.0,
            "eligibility": 2.0,
            "passed": 1.5,
            "failed": 1.5,
        },
        "placement": {
            "placement": 3.0,
            "placements": 3.0,
            "drive": 2.5,
            "drives": 2.5,
            "job": 2.5,
            "jobs": 2.5,
            "internship": 2.5,
            "package": 2.0,
            "ctc": 3.0,
            "lpa": 3.0,
            "super dream": 3.5,
            "tier-1": 3.0,
            "recruiter": 2.5,
            "recruitment": 2.5,
            "interview": 2.5,
            "resume": 2.0,
            "hiring": 2.5,
            "offer": 2.0,
            "one offer": 3.0,
        },
        "finance": {
            "fee": 3.0,
            "fees": 3.0,
            "dues": 2.5,
            "tuition": 3.0,
            "fine": 2.5,
            "fines": 2.5,
            "late fee": 3.0,
            "receipt": 2.5,
            "payment": 2.0,
            "paid": 2.0,
            "transaction": 2.0,
            "hostel": 2.5,
            "mess": 2.5,
            "rebate": 3.0,
            "curfew": 2.5,
            "scholarship": 2.5,
        },
        "grievance": {
            "grievance": 3.5,
            "complaint": 3.0,
            "issue": 1.8,
            "ticket": 2.5,
            "redressal": 3.0,
            "support": 1.8,
            "helpdesk": 2.5,
            "report": 1.5,
            "escalate": 2.5,
        },
        "general": {
            "hello": 1.0,
            "hi": 1.0,
            "help": 1.0,
            "who are you": 2.0,
            "university": 1.0,
            "timing": 1.5,
            "location": 1.5,
        },
    }

    AGENT_MAPPING = {
        "academic": "Academic Advisor",
        "examination": "Examination Officer",
        "placement": "Placement Coordinator",
        "finance": "Financial & Support Counselor",
        "grievance": "Grievance Redressal Officer",
        "general": "Universal AI Advisor",
    }

    COMPANY_LIST = [
        "google", "microsoft", "amazon", "apple", "meta", "infosys",
        "tcs", "wipro", "cisco", "accenture", "ibm", "nvidia", "intel",
        "deloitte", "oracle", "sap", "uber", "adobe"
    ]

    @classmethod
    def extract_entities(cls, query: str) -> ExtractedEntities:
        """Extract structured domain entities from query text."""
        q_lower = query.lower()

        # 1. Course Codes (e.g. CS601, CS602, EC501, ME401, MAT101)
        course_codes = re.findall(r"\b[A-Z]{2,4}\s*\d{3}\b", query, flags=re.IGNORECASE)
        normalized_courses = [re.sub(r"\s+", "", c).upper() for c in course_codes]

        # 2. Target Companies
        detected_companies = [comp.title() for comp in cls.COMPANY_LIST if comp in q_lower]

        # 3. Percentages (e.g. 75%, 68.5%, 85 %)
        percentages = re.findall(r"\b\d{1,3}(?:\.\d+)?\s*%", query)

        # 4. Semester Numbers (e.g. 6th sem, semester 6, sem 6)
        sem_matches = re.findall(r"(?:semester|sem)\s*([1-8])\b|([1-8])(?:st|nd|rd|th)?\s*(?:sem|semester)\b", q_lower)
        semesters = []
        for m in sem_matches:
            for val in m:
                if val:
                    semesters.append(int(val))

        # 5. CGPA (e.g. cgpa 8.42, 8.5 cgpa, cgpa of 7.8)
        cgpa = None
        cgpa_match = re.search(r"(?:cgpa\s*(?:of|is|:)?\s*|gpa\s*(?:of|is|:)?\s*)(\d(?:\.\d{1,2})?)|\b(\d\.\d{1,2})\s*(?:cgpa|gpa)\b", q_lower)
        if cgpa_match:
            val = cgpa_match.group(1) or cgpa_match.group(2)
            try:
                cgpa = float(val)
            except ValueError:
                pass

        # 6. Dates (e.g. 15th June, 2026-06-15, July 31st)
        dates = re.findall(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\b\d{4}-\d{2}-\d{2}\b", q_lower)

        return ExtractedEntities(
            course_codes=list(set(normalized_courses)),
            companies=list(set(detected_companies)),
            percentages=percentages,
            semesters=list(set(semesters)),
            cgpa=cgpa,
            dates=dates,
        )

    @classmethod
    def classify(cls, query: str) -> IntentClassificationResult:
        """
        Classify incoming natural language queries with token weight scoring,
        compound multi-intent detection, and domain entity extraction.
        """
        q_lower = query.lower()
        words = re.findall(r"\b\w+\b", q_lower)

        scores: Dict[str, float] = {intent: 0.0 for intent in cls.INTENT_KEYWORDS}

        # Calculate scores based on single word and multi-word triggers
        for intent, keywords in cls.INTENT_KEYWORDS.items():
            for kw, weight in keywords.items():
                if " " in kw:
                    if kw in q_lower:
                        scores[intent] += weight * 1.5
                else:
                    if kw in words:
                        scores[intent] += weight

        # Contextual boosts based on extracted entities
        entities = cls.extract_entities(query)
        if entities.course_codes:
            scores["academic"] += 2.0
        if entities.companies:
            scores["placement"] += 2.5
        if entities.percentages and "attend" in q_lower:
            scores["academic"] += 2.0

        # Sort intents by score
        sorted_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_intent, top_score = sorted_intents[0]

        # Calculate normalized confidence
        total_score = sum(scores.values())
        confidence = 0.5
        if total_score > 0:
            confidence = min(0.99, max(0.55, round(top_score / (top_score + 2.0), 2)))

        if top_score == 0:
            top_intent = "general"
            confidence = 0.50

        # Detect compound queries (secondary intents with significant score)
        secondary_intents = []
        is_compound = False

        for intent, score in sorted_intents[1:]:
            if score >= 2.0 and score >= (top_score * 0.45):
                secondary_intents.append({
                    "intent": intent,
                    "score": round(score, 2),
                    "agent": cls.AGENT_MAPPING.get(intent, "General Assistant"),
                })
                is_compound = True

        recommended_agent = cls.AGENT_MAPPING.get(top_intent, "Universal AI Advisor")

        return IntentClassificationResult(
            query=query,
            primary_intent=top_intent,
            confidence=confidence,
            secondary_intents=secondary_intents,
            is_compound_query=is_compound,
            recommended_agent=recommended_agent,
            extracted_entities=entities,
        )
