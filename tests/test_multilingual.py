import pytest
from app.ai.multilingual.language_detector import LanguageDetector
from app.ai.multilingual.multilingual_engine import MultilingualEngine
from app.ai.personalization import StudentProfileContext


def test_language_detection_scripts():
    # 1. Kannada
    kn_text = "ನನ್ನ ಹಾಜರಾತಿ ವಿವರ ತಿಳಿಸಿ"
    lang, conf = LanguageDetector.detect_language(kn_text)
    assert lang == "kn"
    assert conf > 0.8

    # 2. Hindi
    hi_text = "मेरी परीक्षा कब है?"
    lang_hi, conf_hi = LanguageDetector.detect_language(hi_text)
    assert lang_hi == "hi"
    assert conf_hi > 0.8

    # 3. English
    en_text = "What is my CGPA and eligibility?"
    lang_en, conf_en = LanguageDetector.detect_language(en_text)
    assert lang_en == "en"


def test_multilingual_engine_localization():
    ctx = StudentProfileContext(
        user_id=1,
        full_name="Alex Rivera",
        usn="1DT23CS238",
        department="Computer Science & Engineering",
        semester=6,
        section="A",
        cgpa=9.24,
        overall_attendance=88.5,
        fee_balance=0.0,
        active_backlogs=0,
        placement_status="Eligible",
    )

    kn_greeting = MultilingualEngine.generate_localized_greeting(ctx, lang="kn")
    assert "ನಮಸ್ಕಾರ" in kn_greeting
    assert "Alex Rivera" in kn_greeting
    assert "1DT23CS238" in kn_greeting

    hi_greeting = MultilingualEngine.generate_localized_greeting(ctx, lang="hi")
    assert "नमस्ते" in hi_greeting
    assert "Alex Rivera" in hi_greeting

    raw_markdown = "### Course Attendance\n| CS601 | 88.5% | Eligible |"
    kn_localized = MultilingualEngine.localize_markdown(raw_markdown, "kn", ctx)
    assert "ವಿಶ್ವವಿದ್ಯಾಲಯ ಎಐ" in kn_localized
    assert "CS601" in kn_localized
