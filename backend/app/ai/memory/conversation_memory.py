import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.ai import ChatSession, ChatMessage, SenderType, QueryIntent


@dataclass
class ConversationTurn:
    id: int
    sender: str
    content: str
    intent: Optional[str] = None
    agent_name: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class ResolvedContext:
    active_course_code: Optional[str] = None
    active_company: Optional[str] = None
    active_intent: Optional[str] = None
    referenced_topics: List[str] = field(default_factory=list)
    recent_turns: List[ConversationTurn] = field(default_factory=list)
    summary_text: Optional[str] = None


class ConversationMemoryManager:
    """
    Manages multi-turn conversational memory, sliding window retrieval,
    anaphoric reference resolution, and context summarization for student dialogues.
    """

    # Regex patterns for institutional entities
    COURSE_CODE_PATTERN = re.compile(r"\b([A-Z]{2,4}\s?[0-9]{3,4}[A-Z]?)\b", re.IGNORECASE)
    COMPANY_PATTERN = re.compile(
        r"\b(Google|Microsoft|Amazon|Infosys|TCS|Wipro|Accenture|Cisco|Oracle|Intel|Qualcomm|IBM|Deloitte)\b",
        re.IGNORECASE,
    )
    ANAPHORA_PATTERNS = [
        re.compile(r"\b(that course|this course|that subject|this subject|the subject|it|in it|for it)\b", re.IGNORECASE),
        re.compile(r"\b(that company|this company|that drive|this drive|the drive|for them)\b", re.IGNORECASE),
        re.compile(r"\b(that exam|this exam|the exam)\b", re.IGNORECASE),
    ]

    @classmethod
    def get_sliding_window(
        cls,
        session_id: int,
        db: Session,
        window_size: int = 8,
    ) -> List[ConversationTurn]:
        """
        Retrieve the latest N conversation turns within the sliding window.
        """
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(window_size)
            .all()
        )

        # Reverse to return chronological order
        chronological_msgs = list(reversed(messages))

        turns = []
        for m in chronological_msgs:
            sender_str = m.sender.value if hasattr(m.sender, "value") else str(m.sender)
            intent_str = m.intent.value if m.intent and hasattr(m.intent, "value") else str(m.intent or "general")
            turns.append(
                ConversationTurn(
                    id=m.id,
                    sender=sender_str,
                    content=m.content,
                    intent=intent_str,
                    agent_name=m.agent_name,
                    created_at=m.created_at,
                )
            )
        return turns

    @classmethod
    def extract_context_from_turns(cls, turns: List[ConversationTurn]) -> ResolvedContext:
        """
        Scan recent turns in reverse chronological order to identify active subjects,
        companies, and topics discussed.
        """
        active_course: Optional[str] = None
        active_company: Optional[str] = None
        active_intent: Optional[str] = None
        topics: List[str] = []

        for turn in reversed(turns):
            # Extract course codes if not yet identified
            if not active_course:
                course_matches = cls.COURSE_CODE_PATTERN.findall(turn.content)
                if course_matches:
                    active_course = course_matches[0].upper().replace(" ", "")

            # Extract companies if not yet identified
            if not active_company:
                comp_matches = cls.COMPANY_PATTERN.findall(turn.content)
                if comp_matches:
                    active_company = comp_matches[0].title()

            # Record dominant intent
            if not active_intent and turn.intent and turn.intent != "general":
                active_intent = turn.intent

        summary = None
        if len(turns) >= 6:
            user_queries = [t.content for t in turns if t.sender == "user"]
            summary = f"Prior dialogue covered: {'; '.join(user_queries[-3:])}"

        return ResolvedContext(
            active_course_code=active_course,
            active_company=active_company,
            active_intent=active_intent,
            referenced_topics=topics,
            recent_turns=turns,
            summary_text=summary,
        )

    @classmethod
    def enrich_query_with_context(
        cls,
        query: str,
        context: ResolvedContext,
    ) -> str:
        """
        Resolve anaphoric and relative references in the user query using conversation context.
        E.g., "what about my marks in that course?" -> "what about my marks in CS601?"
        """
        enriched_query = query.strip()

        # Resolve course code references
        if context.active_course_code:
            has_course_mention = cls.COURSE_CODE_PATTERN.search(query)
            if not has_course_mention:
                for pattern in cls.ANAPHORA_PATTERNS[:1]:
                    if pattern.search(enriched_query):
                        enriched_query = pattern.sub(context.active_course_code, enriched_query)
                        break

        # Resolve company references
        if context.active_company:
            has_comp_mention = cls.COMPANY_PATTERN.search(query)
            if not has_comp_mention:
                for pattern in cls.ANAPHORA_PATTERNS[1:2]:
                    if pattern.search(enriched_query):
                        enriched_query = pattern.sub(context.active_company, enriched_query)
                        break

        return enriched_query
