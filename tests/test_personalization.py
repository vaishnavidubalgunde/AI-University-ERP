import pytest
from app.ai.personalization import PersonalizationEngine, StudentProfileContext


def test_student_profile_telemetry_formatting():
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
        academic_standing="Dean's Honor List (Top 5%)",
        enrolled_courses_count=5,
        enrolled_course_codes=["CS601", "CS602", "CS603", "CS604", "CS605"],
    )

    telemetry = PersonalizationEngine.format_system_telemetry(ctx)
    assert "Alex Rivera" in telemetry
    assert "1DT23CS238" in telemetry
    assert "Dean's Honor List" in telemetry
    assert "9.24" in telemetry
    assert "88.5%" in telemetry
    assert "Cleared (Rs. 0 Due)" in telemetry


def test_personalized_recommendations():
    ctx_good = StudentProfileContext(
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
    recs = PersonalizationEngine.get_personalized_recommendations(ctx_good)
    assert any("Super Dream" in r for r in recs)

    ctx_risk = StudentProfileContext(
        user_id=2,
        full_name="John Doe",
        usn="1DT23CS099",
        department="Computer Science & Engineering",
        semester=6,
        section="B",
        cgpa=6.80,
        overall_attendance=71.2,
        fee_balance=15000.0,
        active_backlogs=1,
        placement_status="Not Placed",
    )
    recs_risk = PersonalizationEngine.get_personalized_recommendations(ctx_risk)
    assert any("attendance recovery" in r.lower() for r in recs_risk)
    assert any("fee" in r.lower() for r in recs_risk)
