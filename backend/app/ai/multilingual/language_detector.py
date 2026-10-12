import re
from typing import Tuple


class LanguageDetector:
    """
    High-performance, deterministic trilingual language detection supporting
    English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी).
    """

    KANNADA_UNICODE_RANGE = re.compile(r"[\u0C80-\u0CFF]")
    DEVANAGARI_UNICODE_RANGE = re.compile(r"[\u0900-\u097F]")

    # Common linguistic transliteration indicators
    KANNADA_KEYWORDS = {
        "nanna", "haajaraati", "anke", "parikshe", "hallticket", "namaskara", "yelli", "hege", "shulka",
        "ಹಾಜರಾತಿ", "ಅಂಕಗಳು", "ಪರೀಕ್ಷೆ", "ಪ್ರವೇಶ", "ನಮಸ್ಕಾರ", "ಶುಲ್ಕ", "ವಿಶ್ವವಿದ್ಯಾಲಯ", "ವಿದ್ಯಾರ್ಥಿ"
    }

    HINDI_KEYWORDS = {
        "meri", "upasthiti", "pariksha", "ank", "namaste", "shulk", "kab", "kahan", "kripya",
        "उपस्थिति", "परीक्षा", "अंक", "प्रवेश", "नमस्ते", "शुल्क", "विश्वविद्यालय", "छात्र"
    }

    @classmethod
    def detect_language(cls, text: str) -> Tuple[str, float]:
        """
        Detect language of user input. Returns tuple of (language_code, confidence).
        Supported language codes: 'en', 'kn', 'hi'.
        """
        if not text or not text.strip():
            return "en", 1.0

        cleaned_text = text.strip()

        # 1. Unicode Script Analysis
        kannada_chars = len(cls.KANNADA_UNICODE_RANGE.findall(cleaned_text))
        devanagari_chars = len(cls.DEVANAGARI_UNICODE_RANGE.findall(cleaned_text))
        total_chars = len(re.findall(r"\w", cleaned_text)) or 1

        if kannada_chars > 0 and kannada_chars >= devanagari_chars:
            confidence = min(0.99, round(kannada_chars / total_chars + 0.3, 2))
            return "kn", confidence

        if devanagari_chars > 0 and devanagari_chars > kannada_chars:
            confidence = min(0.99, round(devanagari_chars / total_chars + 0.3, 2))
            return "hi", confidence

        # 2. Transliteration / Romanized Keyword Heuristics
        lower_tokens = set(re.findall(r"\b\w+\b", cleaned_text.lower()))

        kannada_matches = len(lower_tokens.intersection(cls.KANNADA_KEYWORDS))
        hindi_matches = len(lower_tokens.intersection(cls.HINDI_KEYWORDS))

        if kannada_matches > hindi_matches and kannada_matches > 0:
            return "kn", 0.85
        elif hindi_matches > kannada_matches and hindi_matches > 0:
            return "hi", 0.85

        # Default to English
        return "en", 0.95
