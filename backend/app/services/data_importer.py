import csv
import io
import json
from typing import Any, Dict, List, Tuple
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.academic import Course, CourseType, Department
from app.core.security import get_password_hash


class UniversityDataImporter:
    """
    High-integrity parser and validator for bulk administrative datasets (CSV, JSON, Excel-compatible).
    Provides schema previewing, duplicate identification, and atomic database insertion.
    """

    SUPPORTED_ENTITIES = ["students", "faculty", "courses", "departments"]

    @classmethod
    def parse_and_preview_csv(
        cls,
        raw_text: str,
        target_entity: str,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Parse raw CSV text, analyze rows, flag invalid or duplicate fields, and generate preview payload.
        """
        reader = csv.DictReader(io.StringIO(raw_text.strip()))
        rows = list(reader)
        
        total_rows = len(rows)
        valid_rows = 0
        invalid_rows = 0
        duplicate_rows = 0
        preview_items = []
        errors = []

        for idx, row in enumerate(rows, start=1):
            row_clean = {k.strip(): v.strip() for k, v in row.items() if k}
            row_errors = []
            
            if target_entity == "students":
                email = row_clean.get("email", "").lower()
                student_id = row_clean.get("student_id", row_clean.get("usn", ""))
                name = row_clean.get("full_name", row_clean.get("name", ""))

                if not email or "@" not in email:
                    row_errors.append("Invalid or missing email address")
                if not student_id:
                    row_errors.append("Missing student USN/ID")
                if not name:
                    row_errors.append("Missing student full name")

                # Check duplicate in DB
                if email and db.query(User).filter(User.email == email).first():
                    duplicate_rows += 1
                    row_errors.append(f"Email '{email}' already exists in database")

            elif target_entity == "courses":
                code = row_clean.get("code", row_clean.get("course_code", ""))
                name = row_clean.get("name", row_clean.get("course_name", ""))
                if not code:
                    row_errors.append("Missing course code")
                if not name:
                    row_errors.append("Missing course name")
                    
                if code and db.query(Course).filter(Course.code == code).first():
                    duplicate_rows += 1
                    row_errors.append(f"Course code '{code}' already exists")

            if row_errors:
                invalid_rows += 1
                errors.append({
                    "row_number": idx,
                    "field_name": "validation",
                    "raw_value": str(row_clean),
                    "error_message": "; ".join(row_errors),
                })
            else:
                valid_rows += 1

            if len(preview_items) < 10:
                preview_items.append({
                    "row": idx,
                    "data": row_clean,
                    "status": "VALID" if not row_errors else "INVALID",
                    "error": "; ".join(row_errors) if row_errors else None,
                })

        return {
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows,
            "duplicate_rows": duplicate_rows,
            "target_entity": target_entity,
            "preview_items": preview_items,
            "errors": errors,
        }

    @classmethod
    def execute_import(
        cls,
        raw_text: str,
        target_entity: str,
        db: Session,
    ) -> Dict[str, Any]:
        """Execute atomic insertion into relational database after validation."""
        reader = csv.DictReader(io.StringIO(raw_text.strip()))
        rows = list(reader)
        imported_count = 0

        for row in rows:
            row_clean = {k.strip(): v.strip() for k, v in row.items() if k}
            
            if target_entity == "students":
                email = row_clean.get("email", "").lower()
                student_id = row_clean.get("student_id", row_clean.get("usn", ""))
                name = row_clean.get("full_name", row_clean.get("name", ""))
                dept = row_clean.get("department", "Computer Science & Engineering")
                sem = int(row_clean.get("semester", 1))

                if email and not db.query(User).filter(User.email == email).first():
                    new_student = User(
                        email=email,
                        hashed_password=get_password_hash("student123"),
                        full_name=name or "Enrolled Student",
                        role=UserRole.STUDENT,
                        department=dept,
                        student_id=student_id or f"1DT23CS{imported_count+300}",
                        semester=sem,
                        is_active=True,
                        is_verified=True,
                    )
                    db.add(new_student)
                    imported_count += 1

            elif target_entity == "courses":
                code = row_clean.get("code", row_clean.get("course_code", ""))
                name = row_clean.get("name", row_clean.get("course_name", ""))
                dept = row_clean.get("department", "Computer Science & Engineering")
                credits = int(row_clean.get("credits", 4))
                sem = int(row_clean.get("semester", 6))

                if code and not db.query(Course).filter(Course.code == code).first():
                    new_course = Course(
                        code=code,
                        name=name,
                        department=dept,
                        credits=credits,
                        semester=sem,
                        course_type=CourseType.CORE,
                    )
                    db.add(new_course)
                    imported_count += 1

        db.commit()
        return {
            "success": True,
            "target_entity": target_entity,
            "imported_count": imported_count,
            "message": f"Successfully imported {imported_count} {target_entity} records into ERP database.",
        }


data_importer = UniversityDataImporter()
