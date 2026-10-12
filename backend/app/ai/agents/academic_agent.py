import math
from typing import Dict, List, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.academic import Attendance, InternalMark, Course, Enrollment
from app.ai.intent_router import DeterministicIntentRouter
from app.ai.rag.vector_store import VectorStore


class AcademicAgent:
    """
    Deterministic Academic Agent for University ERP.
    Executes exact mathematical calculations for attendance recovery,
    CIE clearance thresholds, condonation assessments, and transcript summaries.
    """

    @classmethod
    def calculate_classes_needed_for_target(cls, attended: int, total: int, target_pct: float = 75.0) -> int:
        """
        Calculate the minimum consecutive classes a student must attend to reach target_pct.
        Formula: (attended + x) / (total + x) >= target_ratio
        x >= (target_ratio * total - attended) / (1 - target_ratio)
        """
        if total == 0:
            return 0
        current_pct = (attended / total) * 100.0
        if current_pct >= target_pct:
            return 0
        target_ratio = target_pct / 100.0
        numerator = (target_ratio * total) - attended
        denominator = 1.0 - target_ratio
        if denominator <= 0:
            return 0
        return max(0, math.ceil(numerator / denominator))

    @classmethod
    def calculate_safe_missable_classes(cls, attended: int, total: int, target_pct: float = 75.0) -> int:
        """
        Calculate maximum classes a student can safely miss while maintaining >= target_pct.
        Formula: attended / (total + y) >= target_ratio
        y <= (attended / target_ratio) - total
        """
        if total == 0:
            return 0
        target_ratio = target_pct / 100.0
        if (attended / total) < target_ratio:
            return 0
        max_total = attended / target_ratio
        return max(0, math.floor(max_total - total))

    @classmethod
    def analyze_attendance(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """Perform comprehensive attendance and recovery calculation for all enrolled courses."""
        records = (
            db.query(Attendance, Course)
            .join(Course, Attendance.course_id == Course.id)
            .filter(Attendance.user_id == user_id)
            .all()
        )

        course_analyses = []
        shortage_count = 0
        condonation_eligible_count = 0
        critical_shortage_count = 0

        for att, course in records:
            pct = round((att.attended_classes / att.total_classes * 100), 2) if att.total_classes > 0 else 100.0
            has_shortage = pct < 75.0
            classes_needed = cls.calculate_classes_needed_for_target(att.attended_classes, att.total_classes, 75.0)
            safe_missable = cls.calculate_safe_missable_classes(att.attended_classes, att.total_classes, 75.0)

            condonation_status = "Compliant (>= 75%)"
            if has_shortage:
                shortage_count += 1
                if pct >= 65.0:
                    condonation_status = "Eligible for Medical Condonation (65% - 74.9%)"
                    condonation_eligible_count += 1
                else:
                    condonation_status = "Critical Shortage / NSAR (< 65% - Ineligible for Condonation)"
                    critical_shortage_count += 1

            course_analyses.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.title,
                "credits": course.credits,
                "faculty_name": course.faculty_name or "Department Faculty",
                "attended_classes": att.attended_classes,
                "total_classes": att.total_classes,
                "percentage": pct,
                "has_shortage": has_shortage,
                "consecutive_classes_needed_for_75": classes_needed,
                "safe_missable_classes": safe_missable,
                "condonation_status": condonation_status,
            })

        avg_attendance = round(sum(c["percentage"] for c in course_analyses) / len(course_analyses), 2) if course_analyses else 100.0

        return {
            "average_attendance": avg_attendance,
            "total_courses": len(course_analyses),
            "shortage_courses_count": shortage_count,
            "condonation_eligible_count": condonation_eligible_count,
            "critical_shortage_count": critical_shortage_count,
            "is_overall_eligible_for_exams": shortage_count == 0,
            "courses": course_analyses,
        }

    @classmethod
    def analyze_cie_marks(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """Perform CIE internal assessment evaluation and SEE minimum required marks calculations."""
        records = (
            db.query(InternalMark, Course)
            .join(Course, InternalMark.course_id == Course.id)
            .filter(InternalMark.user_id == user_id)
            .all()
        )

        course_marks_map = defaultdict(lambda: {"course": None, "marks": []})
        for im, course in records:
            course_marks_map[course.id]["course"] = course
            course_marks_map[course.id]["marks"].append(im)

        marks_analyses = []
        cie_cleared_count = 0
        cie_failed_count = 0

        for course_id, data in course_marks_map.items():
            course = data["course"]
            marks_list = data["marks"]

            test1 = 0.0
            test2 = 0.0
            quiz = 0.0
            assignment = 0.0

            for m in marks_list:
                name_lower = m.assessment_name.lower()
                if "1" in name_lower or "ia-1" in name_lower or "test 1" in name_lower:
                    test1 = m.obtained_marks
                elif "2" in name_lower or "ia-2" in name_lower or "test 2" in name_lower:
                    test2 = m.obtained_marks
                elif "quiz" in name_lower:
                    quiz = m.obtained_marks
                elif "assign" in name_lower or "lab" in name_lower:
                    assignment = m.obtained_marks
                else:
                    test1 = m.obtained_marks

            # Calculate total CIE out of 50
            total_obtained = sum(m.obtained_marks for m in marks_list)
            total_max = sum(m.max_marks for m in marks_list)
            total_cie = round((total_obtained / total_max * 50.0), 2) if total_max > 0 else round(total_obtained, 2)

            is_eligible = total_cie >= 20.0  # Minimum 40% in CIE (20/50)
            if is_eligible:
                cie_cleared_count += 1
            else:
                cie_failed_count += 1

            # Minimum marks in SEE (100 scaled to 50 = 18/50) needed to achieve overall 40% passing
            see_min_needed = max(18.0, 40.0 - total_cie)

            marks_analyses.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.title,
                "test1": test1,
                "test2": test2,
                "quiz": quiz,
                "assignment": assignment,
                "total_cie": total_cie,
                "max_cie": 50.0,
                "is_cie_eligible_for_see": is_eligible,
                "see_min_marks_needed_out_of_50": see_min_needed,
            })

        avg_cie = round(sum(m["total_cie"] for m in marks_analyses) / len(marks_analyses), 2) if marks_analyses else 0.0

        return {
            "average_cie_marks": avg_cie,
            "total_evaluated_courses": len(marks_analyses),
            "cie_cleared_count": cie_cleared_count,
            "cie_failed_count": cie_failed_count,
            "courses": marks_analyses,
        }

    @classmethod
    def generate_advisory_report(
        cls,
        user_id: int,
        db: Session,
        query: Optional[str] = None,
        vector_store: Optional[VectorStore] = None,
    ) -> Dict[str, Any]:
        """Generate structured academic advisory synthesis with deterministic numbers and RAG citations."""
        student = db.query(User).filter(User.id == user_id).first()
        if not student:
            raise ValueError(f"Student with id {user_id} not found.")

        att_analysis = cls.analyze_attendance(user_id, db)
        cie_analysis = cls.analyze_cie_marks(user_id, db)

        # Entity extraction if query provided
        target_course_code = None
        if query:
            classification = DeterministicIntentRouter.classify(query)
            entities = classification.extracted_entities
            if entities.course_codes:
                target_course_code = entities.course_codes[0]

        # Specific course focus or general overview
        focused_course = None
        if target_course_code:
            for c in att_analysis["courses"]:
                if c["course_code"].upper() == target_course_code.upper():
                    focused_course = c
                    break

        # Generate advisory narrative
        paragraphs = []
        paragraphs.append(
            f"**Academic Advisor Report for {student.full_name}** ({student.student_id or '1DT23CS238'}, {student.department or 'CSE'} - Sem {student.semester or 6}, CGPA: **{student.cgpa or 8.42}**)"
        )

        if focused_course:
            pct = focused_course["percentage"]
            paragraphs.append(
                f"### Course Specific Analysis: **{focused_course['course_code']} - {focused_course['course_name']}**"
            )
            paragraphs.append(
                f"- **Current Attendance:** {focused_course['attended_classes']}/{focused_course['total_classes']} classes (**{pct}%**)."
            )
            if focused_course["has_shortage"]:
                needed = focused_course["consecutive_classes_needed_for_75"]
                paragraphs.append(
                    f"⚠️ **Attendance Shortage Alert (< 75%):** You must attend the next **{needed} consecutive classes** without any absence to restore your attendance to 75.0%."
                )
                paragraphs.append(
                    f"- **Condonation Eligibility:** {focused_course['condonation_status']}"
                )
            else:
                missable = focused_course["safe_missable_classes"]
                paragraphs.append(
                    f"✅ **Attendance Healthy:** You have a safe buffer of **{missable} missable class(es)** while remaining above the mandatory 75% university threshold."
                )
        else:
            paragraphs.append(
                f"### Semester Overview (Average Attendance: **{att_analysis['average_attendance']}%** | CIE Avg: **{cie_analysis['average_cie_marks']}/50**)"
            )
            if att_analysis["shortage_courses_count"] > 0:
                shortage_names = [c["course_code"] for c in att_analysis["courses"] if c["has_shortage"]]
                paragraphs.append(
                    f"⚠️ **Attendance Shortage Detected in {len(shortage_names)} Course(s):** {', '.join(shortage_names)}."
                )
                for sc in att_analysis["courses"]:
                    if sc["has_shortage"]:
                        paragraphs.append(
                            f"  - **{sc['course_code']}**: Currently **{sc['percentage']}%** ({sc['attended_classes']}/{sc['total_classes']}). Must attend **{sc['consecutive_classes_needed_for_75']} consecutive classes** to reach 75%."
                        )
            else:
                paragraphs.append(
                    "✅ **All Enrolled Courses Satisfy the 75% Attendance Requirement.** You are fully eligible for Semester End Examinations."
                )

        # Retrieve RAG policy citations
        citations = []
        if vector_store:
            rag_results = vector_store.search(query=query or "Academic regulations attendance condonation 75 percent rule", top_k=2)
            for r in rag_results:
                citations.append({
                    "chunk_id": r["chunk_id"],
                    "document_title": r["document_title"],
                    "filename": r["filename"],
                    "section_title": r["section_title"],
                    "text": r["text"],
                    "similarity_score": r["similarity_score"],
                    "citation": r["citation"],
                })

        advisory_text = "\n\n".join(paragraphs)

        return {
            "student_id": student.id,
            "student_name": student.full_name,
            "usn": student.student_id or "1DT23CS238",
            "department": student.department or "CSE",
            "semester": student.semester or 6,
            "cgpa": student.cgpa or 8.42,
            "attendance_analysis": att_analysis,
            "cie_marks_analysis": cie_analysis,
            "focused_course": focused_course,
            "advisory_markdown": advisory_text,
            "citations": citations,
        }
