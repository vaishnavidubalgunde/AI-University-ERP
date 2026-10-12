import re
from typing import Optional, Tuple
from fastapi import HTTPException, status


class SafetyGuardrails:
    """
    Security guardrails and defense engine against prompt injection, jailbreaks,
    system prompt exfiltration, and unauthorized tenant access.
    """

    # Jailbreak and prompt injection patterns
    INJECTION_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", re.IGNORECASE),
        re.compile(r"(reveal|print|show|dump|leak)\s+(your\s+)?(system\s+prompt|instructions|secret)", re.IGNORECASE),
        re.compile(r"\b(DAN|jailbreak|unrestricted mode|developer mode|god mode)\b", re.IGNORECASE),
        re.compile(r"(<\|im_start\|>|<\|im_end\|>|\[SYSTEM\]|\[ADMIN_OVERRIDE\])", re.IGNORECASE),
        re.compile(r"(drop\s+table|alter\s+table|delete\s+from|union\s+select)", re.IGNORECASE),
    ]

    # Malicious HTML/script patterns
    XSS_PATTERNS = re.compile(r"(<script.*?>.*?</script>|javascript:|onerror\s*=|onload\s*=)", re.IGNORECASE)

    @classmethod
    def check_prompt_safety(cls, prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Evaluate if user prompt contains potential injection or jailbreak attempts.
        Returns (is_safe: bool, reason: Optional[str]).
        """
        if not prompt or not prompt.strip():
            return True, None

        for pattern in cls.INJECTION_PATTERNS:
            if pattern.search(prompt):
                return False, "Input flagged by AI safety filter: Prompt contains forbidden control instructions or jailbreak patterns."

        return True, None

    @classmethod
    def sanitize_user_input(cls, text: str) -> str:
        """
        Sanitize input text by escaping dangerous script tags and neutralizing control tokens.
        """
        if not text:
            return ""
        sanitized = cls.XSS_PATTERNS.sub("", text)
        sanitized = sanitized.replace("\x00", "")
        return sanitized.strip()

    @classmethod
    def enforce_tenant_isolation(
        cls,
        target_user_id: int,
        authenticated_user_id: int,
        is_admin: bool = False,
    ) -> None:
        """
        Zero-trust row-level tenant boundary validation.
        Students can strictly access only their own data records.
        """
        if not is_admin and target_user_id != authenticated_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Violation: Tenant isolation prohibits accessing another student's academic or financial records.",
            )
