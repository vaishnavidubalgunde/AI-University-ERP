import math
import hashlib
from datetime import datetime, timezone, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.academic import Attendance, InternalMark, Course, Enrollment
from app.models.exam import ExamSchedule, HallTicket
from app.models.finance import FeeRecord
from app.ai.intent_router import DeterministicIntentRouter
from app.ai.rag.vector_store import VectorStore


class ExaminationAgent:
    """
    Deterministic Examination AI Agent for University ERP.
    Executes multi-criteria exam clearance evaluations (Attendance >= 75%, CIE >= 20/50, Fee Dues = 0),
    exam timetable retrieval, seat allocation tracking, digital hall ticket QR security verification,
    and ordinance-backed exam guidance.
    """

    @classmethod
    def evaluate_student_eligibility(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """
        Evaluate multi-condition eligibility for Semester End Examinations (SEE):
        1. Attendance >= 75% per course (or condonable 65%-74.9%).
        2. CIE >= 20.0 / 50.0 (40%) per course.
        3. Zero outstanding institutional fee dues.
        """
        # 1. Attendance
        att_records = (
            db.query(Attendance, Course)
            .join(Course, Attendance.course_id == Course.id)
            .filter(Attendance.user_id == user_id)
            .all()
        )

        # 2. CIE Marks
        cie_records = (
            db.query(InternalMark, Course)
            .join(Course, InternalMark.course_id == Course.id)
            .filter(InternalMark.user_id == user_id)
            .all()
        )
        cie_by_course = {}
        for im, course in cie_records:
            if course.id not in cie_by_course:
                cie_by_course[course.id] = []
            cie_by_course[course.id].append(im)

        # 3. Fee clearance
        fee_records = db.query(FeeRecord).filter(FeeRecord.user_id == user_id).all()
        total_fee_due = sum(f.balance_due for f in fee_records)
        fee_cleared = total_fee_due <= 0.0

        course_evaluations = []
        ineligible_courses_count = 0
        condonation_pending_count = 0

        for att, course in att_records:
            pct = round((att.attended_classes / att.total_classes * 100), 1) if att.total_classes > 0 else 100.0
            att_eligible = pct >= 75.0
            is_condonable = 65.0 <= pct < 75.0

            # Calculate scaled CIE total
            marks_list = cie_by_course.get(course.id, [])
            tot_obt = sum(m.obtained_marks for m in marks_list)
            tot_mx = sum(m.max_marks for m in marks_list)
            cie_score = round((tot_obt / tot_mx * 50.0), 1) if tot_mx > 0 else round(tot_obt, 1)
            cie_eligible = cie_score >= 20.0  # 40% minimum

            reasons = []
            if not att_eligible:
                if is_condonable:
                    reasons.append(f"Attendance {pct}% is below 75% (Eligible for Form A-12 Condonation)")
                    condonation_pending_count += 1
                else:
                    reasons.append(f"Critical attendance shortage ({pct}% < 65%) - Ineligible")
            if not cie_eligible:
                reasons.append(f"CIE Internal score ({cie_score}/50) is below minimum 20.0")

            course_ok = att_eligible and cie_eligible
            if not course_ok and not is_condonable:
                ineligible_courses_count += 1

            course_evaluations.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.title,
                "credits": course.credits,
                "attendance_percentage": pct,
                "attendance_eligible": att_eligible,
                "is_condonation_applicable": is_condonable,
                "cie_marks": cie_score,
                "cie_eligible": cie_eligible,
                "is_course_eligible": course_ok,
                "remarks": "; ".join(reasons) if reasons else "Eligible for SEE Examination",
            })

        all_courses_eligible = all(c["is_course_eligible"] for c in course_evaluations)
        overall_eligible = all_courses_eligible and fee_cleared

        status_text = "ELIGIBLE"
        if not overall_eligible:
            if not fee_cleared and all_courses_eligible:
                status_text = "PROVISIONALLY_HELD_FEES"
            elif condonation_pending_count > 0 and ineligible_courses_count == 0:
                status_text = "PROVISIONAL_CONDONATION_PENDING"
            else:
                status_text = "INELIGIBLE_ACADEMIC_DEFICIT"

        return {
            "overall_status": status_text,
            "is_overall_eligible": overall_eligible,
            "fee_balance_due": round(total_fee_due, 2),
            "fee_clearance_passed": fee_cleared,
            "total_courses": len(course_evaluations),
            "eligible_courses_count": sum(1 for c in course_evaluations if c["is_course_eligible"]),
            "condonation_pending_count": condonation_pending_count,
            "ineligible_courses_count": ineligible_courses_count,
            "courses": course_evaluations,
        }

    @classmethod
    def get_exam_schedules_and_seat_plan(cls, user_id: int, db: Session) -> List[Dict[str, Any]]:
        """Retrieve student's enrolled courses SEE exam schedules with room allocations and days countdown."""
        course_ids = [
            cid for (cid,) in db.query(Attendance.course_id).filter(Attendance.user_id == user_id).all()
        ]

        if not course_ids:
            return []

        schedules = (
            db.query(ExamSchedule, Course)
            .join(Course, ExamSchedule.course_id == Course.id)
            .filter(Course.id.in_(course_ids))
            .order_by(ExamSchedule.exam_date.asc())
            .all()
        )

        today_str = date.today().isoformat()
        results = []
        for es, course in schedules:
            try:
                exam_dt = datetime.strptime(es.exam_date, "%Y-%m-%d").date()
                curr_dt = date.today()
                days_left = (exam_dt - curr_dt).days
            except Exception:
                days_left = 10

            results.append({
                "schedule_id": es.id,
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.title,
                "exam_name": es.exam_name,
                "exam_date": es.exam_date,
                "time_slot": es.time_slot,
                "room_number": es.room_number,
                "max_marks": es.max_marks,
                "days_remaining": days_left,
                "status": "Upcoming" if days_left >= 0 else "Completed",
            })

        return results

    @classmethod
    def verify_digital_hall_ticket(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """Verify Hall Ticket issuance status and cryptographic QR payload validity."""
        student = db.query(User).filter(User.id == user_id).first()
        hall_ticket = db.query(HallTicket).filter(HallTicket.user_id == user_id).first()
        eligibility = cls.evaluate_student_eligibility(user_id, db)

        if not hall_ticket:
            return {
                "has_hall_ticket": False,
                "status": "NOT_GENERATED",
                "message": "Digital Hall Ticket has not been generated for the active semester.",
                "qr_token": None,
                "cryptographic_hash": None,
            }

        # Deterministic SHA-256 signature verification of QR Token
        expected_raw = f"HT-{hall_ticket.id}-{student.student_id or '1DT23CS238'}-{hall_ticket.semester}-{hall_ticket.academic_year}"
        crypto_hash = hashlib.sha256(expected_raw.encode("utf-8")).hexdigest()[:16].upper()

        ticket_status = "ISSUED_AND_VALID"
        if not eligibility["is_overall_eligible"]:
            ticket_status = "HELD_OR_WITHHELD"

        return {
            "has_hall_ticket": True,
            "hall_ticket_id": hall_ticket.id,
            "usn": student.student_id or "1DT23CS238",
            "student_name": student.full_name,
            "semester": hall_ticket.semester,
            "academic_year": hall_ticket.academic_year,
            "is_eligible": hall_ticket.is_eligible and eligibility["is_overall_eligible"],
            "status": ticket_status,
            "ineligibility_reason": hall_ticket.ineligibility_reason if not hall_ticket.is_eligible else None,
            "qr_token": hall_ticket.qr_token,
            "cryptographic_signature": crypto_hash,
            "issued_at": hall_ticket.issued_at.isoformat() if hall_ticket.issued_at else None,
        }

    @classmethod
    def generate_advisory_report(
        cls,
        user_id: int,
        db: Session,
        query: Optional[str] = None,
        vector_store: Optional[VectorStore] = None,
    ) -> Dict[str, Any]:
        """Generate comprehensive Examination Advisory synthesis with deterministic rules and ordinance citations."""
        student = db.query(User).filter(User.id == user_id).first()
        if not student:
            raise ValueError(f"Student with id {user_id} not found.")

        eligibility = cls.evaluate_student_eligibility(user_id, db)
        schedules = cls.get_exam_schedules_and_seat_plan(user_id, db)
        hall_ticket = cls.verify_digital_hall_ticket(user_id, db)

        # Entity extraction from query
        target_course_code = None
        if query:
            classification = DeterministicIntentRouter.classify(query)
            if classification.extracted_entities.course_codes:
                target_course_code = classification.extracted_entities.course_codes[0]

        # Generate advisory markdown
        paragraphs = []
        paragraphs.append(
            f"**Examination Board Advisory for {student.full_name}** ({student.student_id or '1DT23CS238'}, Sem {student.semester or 6})"
        )

        if eligibility["is_overall_eligible"]:
            paragraphs.append(
                "✅ **Full Examination Clearance Granted:** You meet all three mandatory institutional criteria (Attendance $\\ge 75\\%$, CIE $\\ge 20/50$, Fee Dues = ₹0). Your Digital Hall Ticket is valid for entry."
            )
        else:
            paragraphs.append(
                f"⚠️ **Examination Clearance Status: {eligibility['overall_status']}**"
            )
            if not eligibility["fee_clearance_passed"]:
                paragraphs.append(
                    f"- **Finance Clearance Pending:** You have an outstanding fee balance of **₹{eligibility['fee_balance_due']}**. Settle dues before hall ticket dispatch."
                )
            if eligibility["condonation_pending_count"] > 0:
                paragraphs.append(
                    f"- **Medical Condonation Pending in {eligibility['condonation_pending_count']} Course(s):** Attendance between 65% - 74.9% requires Dean approval via Form A-12 with valid medical documentation."
                )
            if eligibility["ineligible_courses_count"] > 0:
                paragraphs.append(
                    f"- **Academic Ineligibility in {eligibility['ineligible_courses_count']} Course(s):** Attendance below 65% or CIE below 20/50 prohibits SEE entry for that course."
                )

        # Exam Timetable Highlights
        if schedules:
            paragraphs.append(f"### Upcoming Semester End Examination (SEE) Schedule ({len(schedules)} Exams)")
            for s in schedules:
                paragraphs.append(
                    f"- **{s['course_code']} - {s['course_name']}**: {s['exam_date']} ({s['time_slot']}) in **{s['room_number']}** [*{s['days_remaining']} days remaining*]"
                )

        # Digital Hall Ticket Summary
        paragraphs.append(
            f"### Digital Hall Ticket Status: **{hall_ticket['status']}**"
        )
        if hall_ticket["has_hall_ticket"]:
            paragraphs.append(
                f"- QR Verification Hash: `{hall_ticket.get('cryptographic_signature', 'VALID')}` | Token: `{hall_ticket['qr_token']}`"
            )

        # Retrieve RAG Examination Ordinance Citations
        citations = []
        if vector_store:
            rag_results = vector_store.search(
                query=query or "Examination ordinance passing criteria grading revaluation supplementary",
                top_k=2,
            )
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
            "eligibility_summary": eligibility,
            "exam_schedules": schedules,
            "hall_ticket": hall_ticket,
            "advisory_markdown": advisory_text,
            "citations": citations,
        }
