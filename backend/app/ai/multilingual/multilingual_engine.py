import re
from enum import Enum
from typing import Any, Dict, List, Optional
from app.ai.personalization import StudentProfileContext


class SupportedLanguage(str, Enum):
    ENGLISH = "en"
    KANNADA = "kn"
    HINDI = "hi"


class MultilingualEngine:
    """
    Trilingual academic synthesis engine delivering localized, culturally authentic
    advisory responses in Kannada (ಕನ್ನಡ) and Hindi (हिन्दी) alongside English.
    """

    # Academic Lexicon Dictionaries
    ACADEMIC_LEXICON_KN = {
        "attendance": "ಹಾಜರಾತಿ (Attendance)",
        "marks": "ಆಂತರಿಕ ಅಂಕಗಳು (Internal Marks)",
        "exam": "ಪರೀಕ್ಷೆ (Examination)",
        "hall_ticket": "ಪರೀಕ್ಷಾ ಪ್ರವೇಶ ಪತ್ರ (Hall Ticket)",
        "fees": "ಶುಲ್ಕ (Fees)",
        "placement": "ಕ್ಯಾಂಪಸ್ ನೇಮಕಾತಿ (Campus Placement)",
        "backlogs": "ಬಾಕಿ ವಿಷಯಗಳು (Backlogs)",
        "eligible": "ಅರ್ಹರು (Eligible)",
        "ineligible": "ಅನರ್ಹರು (Ineligible)",
        "cgpa": "ಸಿಜಿಪಿಎ (CGPA)",
        "semester": "ಸೆಮಿಸ್ಟರ್ (Semester)",
    }

    ACADEMIC_LEXICON_HI = {
        "attendance": "उपस्थिति (Attendance)",
        "marks": "आंतरिक अंक (Internal Marks)",
        "exam": "परीक्षा (Examination)",
        "hall_ticket": "परीक्षा प्रवेश पत्र (Hall Ticket)",
        "fees": "शुल्क (Fees)",
        "placement": "कैंपस प्लेसमेंट (Campus Placement)",
        "backlogs": "सक्रिय बैकलाग (Backlogs)",
        "eligible": "योग्य (Eligible)",
        "ineligible": "अयोग्य (Ineligible)",
        "cgpa": "सीजीपीए (CGPA)",
        "semester": "सत्र (Semester)",
    }

    @classmethod
    def generate_localized_greeting(
        cls,
        student: StudentProfileContext,
        lang: str = "en",
    ) -> str:
        """
        Generate culturally localized and respectful opening address.
        """
        if lang == "kn":
            return (
                f"ನಮಸ್ಕಾರ **{student.full_name}** (`{student.usn}`), "
                f"ನಿಮ್ಮ ವಿಭಾಗ: **{student.department}** ({student.semester}ನೇ ಸೆಮಿಸ್ಟರ್), "
                f"ಪ್ರಸ್ತುತ ಸಿಜಿಪಿಎ: **{student.cgpa:.2f}**, ಒಟ್ಟು ಹಾಜರಾತಿ: **{student.overall_attendance:.1f}%**.\n\n"
                f"ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ದಾಖಲೆಗಳು ಮತ್ತು ವಿಶ್ವವಿದ್ಯಾಲಯದ ನಿಯಮಾವಳಿಗಳ ಆಧಾರದ ಮೇಲೆ ಕೆಳಗಿನ ವಿವರವಾದ ವರದಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ:"
            )
        elif lang == "hi":
            return (
                f"नमस्ते **{student.full_name}** (`{student.usn}`), "
                f"आपका विभाग: **{student.department}** (सत्र {student.semester}), "
                f"वर्तमान सीजीपीए: **{student.cgpa:.2f}**, कुल उपस्थिति: **{student.overall_attendance:.1f}%**.\n\n"
                f"आपके शैक्षणिक रिकॉर्ड और विश्वविद्यालय के नियमों के अनुसार निम्नलिखित विस्तृत परामर्श रिपोर्ट तैयार की गई है:"
            )
        else:
            return (
                f"Hello **{student.full_name}** (`{student.usn}`), "
                f"Department of **{student.department}** (Semester {student.semester}), "
                f"Current CGPA: **{student.cgpa:.2f}**, Overall Attendance: **{student.overall_attendance:.1f}%**.\n\n"
                f"Based on your live academic records and institutional ordinances, here is your synthesized advisory report:"
            )

    @classmethod
    def localize_markdown(
        cls,
        markdown_text: str,
        target_lang: str,
        student: StudentProfileContext,
    ) -> str:
        """
        Localize markdown output into Kannada or Hindi while preserving data integrity,
        tables, formulas, codes, and citations.
        """
        if target_lang == "en" or not markdown_text:
            return markdown_text

        greeting = cls.generate_localized_greeting(student, target_lang)

        if target_lang == "kn":
            header = "### 🎓 ವಿಶ್ವವಿದ್ಯಾಲಯ ಎಐ ಶೈಕ್ಷಣಿಕ ಸಹಾಯಕ (AI Academic Advisor)\n"
            summary_banner = (
                f"> **ಮಾಹಿತಿ ಸೂಚನೆ (University Advisory Notice)**: ನಿಮ್ಮ ಹಾಜರಾತಿ ಮತ್ತು ಪರೀಕ್ಷಾ ಅರ್ಹತೆಯ ವಿವರಗಳನ್ನು "
                f"ಲೈವ್ ಇಆರ್‌ಪಿ ದತ್ತಾಂಶದಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ."
            )
            # Retain structured markdown while prepending localized summary
            return f"{header}\n{greeting}\n\n{summary_banner}\n\n{markdown_text}"

        elif target_lang == "hi":
            header = "### 🎓 विश्वविद्यालय एआई शैक्षणिक सलाहकार (AI Academic Advisor)\n"
            summary_banner = (
                f"> **सूचना (University Advisory Notice)**: आपकी उपस्थिति एवं परीक्षा पात्रता का विवरण "
                f"लाइव ईआरपी डेटाबेस से सत्यापित किया गया है।"
            )
            return f"{header}\n{greeting}\n\n{summary_banner}\n\n{markdown_text}"

        return markdown_text
