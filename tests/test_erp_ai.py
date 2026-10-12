import pytest
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.ai.question_router import QuestionRouter
from app.ai.rag.vector_store import VectorStore

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def vector_store():
    return VectorStore()

def test_student_attendance_query(db, vector_store):
    student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    assert student is not None
    result = QuestionRouter.process_query("What is my attendance?", user=student, db=db, vector_store=vector_store)
    assert result["route"] == "PERSONAL_ERP"
    assert student.full_name in result["answer"]

def test_faculty_assigned_students_query(db, vector_store):
    faculty = db.query(User).filter(User.role == UserRole.FACULTY).first()
    assert faculty is not None
    result = QuestionRouter.process_query("How many students are assigned to me?", user=faculty, db=db, vector_store=vector_store)
    assert result["route"] == "FACULTY_ERP"
    assert faculty.full_name in result["answer"]

def test_admin_institutional_query(db, vector_store):
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert admin is not None
    result = QuestionRouter.process_query("How many students are there?", user=admin, db=db, vector_store=vector_store)
    assert result["route"] == "ADMIN_ERP"
    assert "Institutional Executive Overview" in result["answer"]

def test_mixed_rag_query(db, vector_store):
    student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    result = QuestionRouter.process_query("Based on my attendance and the university rule, am I eligible?", user=student, db=db, vector_store=vector_store)
    assert result["route"] == "MIXED"
    assert "75" in result["answer"]
