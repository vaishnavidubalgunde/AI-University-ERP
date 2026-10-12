import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models import User, UserRole
from app.core.security import create_access_token

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    from app.db.seed import seed_database
    seed_database()


def get_token_for_user(email: str, role: str):
    return create_access_token(subject=email, role=role)


def test_faculty_dashboard_kpis_and_analytics():
    token = get_token_for_user("dr.sharma@univ.edu", "faculty")
    headers = {"Authorization": f"Bearer {token}"}

    # Test Dashboard
    res = client.get("/api/v1/faculty/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert data["kpis"]["assigned_subjects"] >= 1
    assert data["kpis"]["average_attendance"] > 0
    assert len(data["assigned_courses"]) >= 1
    assert len(data["recent_classes"]) >= 1

    # Test Course Student Roster with filters
    course_id = data["assigned_courses"][0]["id"]
    roster_res = client.get(f"/api/v1/faculty/courses/{course_id}/students?semester=6&section=A", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert len(roster) >= 1
    assert "attendance_percentage" in roster[0]
    assert "cie1_score" in roster[0]

    # Test Analytics
    analytics_res = client.get(f"/api/v1/faculty/analytics?course_id={course_id}", headers=headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "attendance_distribution" in analytics
    assert "cie_distribution" in analytics
    assert len(analytics["performance_trends"]) >= 1

    # Test 360 Student Profile
    student_id = roster[0]["user_id"]
    profile_res = client.get(f"/api/v1/faculty/students/{student_id}/profile", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["student_name"] is not None
    assert "attendance_records" in profile
    assert "ai_academic_insights" in profile
    assert len(profile["ai_academic_insights"]) >= 1

    # Test Timetable
    tt_res = client.get("/api/v1/faculty/timetable", headers=headers)
    assert tt_res.status_code == 200
    assert len(tt_res.json()) >= 1


def test_admin_erp_analytics_and_telemetry():
    token = get_token_for_user("admin@univ.edu", "admin")
    headers = {"Authorization": f"Bearer {token}"}

    # Test Real-time Telemetry
    telem_res = client.get("/api/v1/admin/telemetry", headers=headers)
    assert telem_res.status_code == 200
    telem = telem_res.json()
    assert "active_students_online" in telem
    assert "campus_attendance_today" in telem

    # Test Attendance Analytics
    att_res = client.get("/api/v1/admin/analytics/attendance?department=CSE", headers=headers)
    assert att_res.status_code == 200
    att_data = att_res.json()
    assert "department_attendance" in att_data
    assert "monthly_trends" in att_data

    # Test Academic Analytics
    acad_res = client.get("/api/v1/admin/analytics/academics", headers=headers)
    assert acad_res.status_code == 200
    acad_data = acad_res.json()
    assert acad_data["overall_average_marks"] > 0
    assert "department_performance" in acad_data

    # Test Placement Analytics
    place_res = client.get("/api/v1/admin/analytics/placements", headers=headers)
    assert place_res.status_code == 200
    place_data = place_res.json()
    assert "application_funnel" in place_data
    assert place_data["average_ctc"] > 0

    # Test Grievance Analytics
    grv_res = client.get("/api/v1/admin/analytics/grievances", headers=headers)
    assert grv_res.status_code == 200
    grv_data = grv_res.json()
    assert "category_breakdown" in grv_data

    # Test Fee Analytics
    fee_res = client.get("/api/v1/admin/analytics/fees", headers=headers)
    assert fee_res.status_code == 200
    fee_data = fee_res.json()
    assert fee_data["collection_rate"] > 0


def test_predictive_analytics_and_recommendations():
    token = get_token_for_user("alex.kumar@univ.edu", "student")
    headers = {"Authorization": f"Bearer {token}"}

    # Test Comprehensive Recommendations
    rec_res = client.get("/api/v1/ai/recommendations/comprehensive", headers=headers)
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert "attendance_risks" in rec_data
    assert "academic_risks" in rec_data
    assert "study_recommendations" in rec_data
    assert "course_recommendations" in rec_data
    assert len(rec_data["study_recommendations"]) >= 1

    # Test Attendance Risk
    att_risk_res = client.get("/api/v1/ai/recommendations/attendance-risk", headers=headers)
    assert att_risk_res.status_code == 200
    assert len(att_risk_res.json()) >= 1


def test_enhanced_placement_ai():
    token = get_token_for_user("alex.kumar@univ.edu", "student")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Resume Analysis
    resume_payload = {
        "resume_text": "Experienced in Python, FastAPI, React, Docker, and PostgreSQL. Built distributed file systems with Raft consensus and semantic search engines.",
        "target_role": "Software Development Engineer (SDE-1)",
        "target_company_type": "Product Company",
    }
    resume_res = client.post("/api/v1/ai/placement/analyze-resume", json=resume_payload, headers=headers)
    assert resume_res.status_code == 200
    resume_data = resume_res.json()
    assert len(resume_data["extracted_skills"]) >= 1
    assert resume_data["role_relevance_score"] >= 60
    assert len(resume_data["bullet_point_improvements"]) >= 1

    # 2. Test Mock Interview Simulator Turn-by-Turn Flow
    start_payload = {
        "target_role": "Backend Engineer",
        "company_type": "Product",
        "domain_tech": "Python, Distributed Systems",
        "difficulty": "Intermediate",
    }
    start_res = client.post("/api/v1/ai/placement/mock-interview/start", json=start_payload, headers=headers)
    assert start_res.status_code == 200
    start_data = start_res.json()
    interview_id = start_data["interview_id"]
    assert start_data["first_question"] is not None

    # Evaluate Answer
    eval_payload = {
        "interview_id": interview_id,
        "question_index": 1,
        "question_text": start_data["first_question"],
        "student_answer": "I designed a distributed cache using Redis and FastAPI. We used consistent hashing for node distribution, reducing database load by 45%.",
    }
    eval_res = client.post("/api/v1/ai/placement/mock-interview/evaluate", json=eval_payload, headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["score_out_of_10"] >= 7.0
    assert "feedback" in eval_data

    # Finish Interview
    finish_payload = {"interview_id": interview_id}
    finish_res = client.post("/api/v1/ai/placement/mock-interview/finish", json=finish_payload, headers=headers)
    assert finish_res.status_code == 200
    finish_data = finish_res.json()
    assert finish_data["overall_score"] >= 7.0
    assert "preparation_plan_markdown" in finish_data

    # 3. Test Placement Readiness Scorecard
    readiness_res = client.get("/api/v1/ai/placement/readiness/1", headers=headers)
    assert readiness_res.status_code == 200
    readiness_data = readiness_res.json()
    assert readiness_data["readiness_score"] >= 70
    assert len(readiness_data["factors"]) >= 4
