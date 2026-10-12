import pytest
from app.ai.memory.conversation_memory import (
    ConversationMemoryManager,
    ConversationTurn,
    ResolvedContext,
)


def test_extract_context_from_turns():
    turns = [
        ConversationTurn(
            id=1,
            sender="user",
            content="What is my attendance in CS601?",
            intent="academic",
        ),
        ConversationTurn(
            id=2,
            sender="ai_agent",
            content="Your attendance in CS601 is 82.5%.",
            intent="academic",
        ),
        ConversationTurn(
            id=3,
            sender="user",
            content="Can I apply for Google placement drive?",
            intent="placement",
        ),
    ]

    ctx = ConversationMemoryManager.extract_context_from_turns(turns)
    assert ctx.active_company == "Google"
    assert ctx.active_course_code == "CS601"
    assert ctx.active_intent == "placement"


def test_enrich_query_anaphora_resolution():
    context = ResolvedContext(
        active_course_code="CS601",
        active_company="Google",
        active_intent="academic",
    )

    # 1. Pronoun referring to course
    q1 = "what are my internal marks in that course?"
    enriched_q1 = ConversationMemoryManager.enrich_query_with_context(q1, context)
    assert "CS601" in enriched_q1

    # 2. Pronoun referring to company
    q2 = "what is the CTC for that company?"
    enriched_q2 = ConversationMemoryManager.enrich_query_with_context(q2, context)
    assert "Google" in enriched_q2

    # 3. Query with explicit entity not overwritten
    q3 = "what is my attendance in CS602?"
    enriched_q3 = ConversationMemoryManager.enrich_query_with_context(q3, context)
    assert "CS602" in enriched_q3
