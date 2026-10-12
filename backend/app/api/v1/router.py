from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.student import router as student_router
from app.api.v1.academics import router as academic_router
from app.api.v1.exams import router as exam_router
from app.api.v1.finance import router as finance_router
from app.api.v1.notices import router as notice_router
from app.api.v1.placements import router as placement_router
from app.api.v1.grievances import router as grievance_router
from app.api.v1.admin import router as admin_router
from app.api.v1.ai import router as ai_router
from app.api.v1.faculty import router as faculty_router
from app.api.v1.notifications import router as notification_router
from app.api.v1.audit import router as audit_router
from app.api.v1.data_ingestion import router as data_ingestion_router
from app.api.v1.admissions import router as admissions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(admissions_router)
api_router.include_router(student_router)
api_router.include_router(faculty_router)
api_router.include_router(academic_router)
api_router.include_router(exam_router)
api_router.include_router(finance_router)
api_router.include_router(notice_router)
api_router.include_router(notification_router)
api_router.include_router(placement_router)
api_router.include_router(grievance_router)
api_router.include_router(admin_router)
api_router.include_router(audit_router)
api_router.include_router(data_ingestion_router)
api_router.include_router(ai_router)


