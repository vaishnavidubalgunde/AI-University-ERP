from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.academic import Enrollment, Attendance, InternalMark, Course
from app.models.exam import ExamSchedule
from app.models.finance import FeeRecord, FeeStatus
from app.models.placement import PlacementDrive, PlacementApplication, ApplicationStatus
from app.ai.personalization import PersonalizationEngine, StudentProfileContext


class ProactiveAnalyticsEngine:
    """
    Proactive AI Analytics Engine powering weekly briefings, institutional risk radar,
    early-warning detection, and smart revision study planners.
    """

    @classmethod
    def generate_weekly_briefing(
        cls,
        user_id: int,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Synthesize weekly academic briefing with KPI health, highlights, and urgent action items.
        """
        student_ctx = PersonalizationEngine.build_student_context(user_id, db)

        # 1. Upcoming exams
        course_ids = [
            cid for (cid,) in db.query(Attendance.course_id).filter(Attendance.user_id == user_id).all()
        ]
        if not course_ids:
            course_ids = [
                cid for (cid,) in db.query(Enrollment.course_id).filter(Enrollment.user_id == user_id).all()
            ]

        schedules = (
            db.query(ExamSchedule, Course)
            .join(Course, ExamSchedule.course_id == Course.id)
            .filter(Course.id.in_(course_ids))
            .order_by(ExamSchedule.exam_date.asc())
            .all()
        ) if course_ids else []

        upcoming_exam_items = []
        for es, c in schedules:
            upcoming_exam_items.append({
                "course_code": c.code,
                "course_name": c.title,
                "exam_date": str(es.exam_date),
                "session": str(es.time_slot),
                "room": es.room_number or "Hall A",
            })

        # 2. Key Highlights & Action Items
        highlights = [
            f"Your current CGPA is **{student_ctx.cgpa:.2f}**, placing you in **{student_ctx.academic_standing}**.",
            f"Overall attendance stands at **{student_ctx.overall_attendance:.1f}%** across {student_ctx.enrolled_courses_count} registered courses.",
        ]

        urgent_action_items = []
        if student_ctx.overall_attendance < 75.0:
            urgent_action_items.append("⚠️ Attend all upcoming lecture and lab sessions to regain semester exam eligibility.")
        if student_ctx.fee_balance > 0:
            urgent_action_items.append(f"💳 Settle outstanding fee dues of Rs. {student_ctx.fee_balance:,.2f} before hall ticket generation.")
        if upcoming_exam_items:
            first_exam = upcoming_exam_items[0]
            urgent_action_items.append(f"📅 Next examination: **{first_exam['course_code']} ({first_exam['course_name']})** on {first_exam['exam_date']}.")
        if not urgent_action_items:
            urgent_action_items.append("✨ All academic, financial, and examination vitals are in optimal standing.")

        briefing_markdown = (
            f"### 📊 Weekly AI Academic Briefing\n\n"
            f"**Student**: {student_ctx.full_name} (`{student_ctx.usn}`) | **Standing**: {student_ctx.academic_standing}\n\n"
            f"#### 🌟 Performance Highlights\n"
            + "\n".join([f"- {h}" for h in highlights])
            + f"\n\n#### 🎯 Immediate Priority Action Items\n"
            + "\n".join([f"- {a}" for a in urgent_action_items])
        )

        return {
            "student_id": student_ctx.user_id,
            "student_name": student_ctx.full_name,
            "usn": student_ctx.usn,
            "cgpa": student_ctx.cgpa,
            "overall_attendance": student_ctx.overall_attendance,
            "fee_balance": student_ctx.fee_balance,
            "upcoming_exams_count": len(upcoming_exam_items),
            "upcoming_exams": upcoming_exam_items,
            "highlights": highlights,
            "urgent_actions": urgent_action_items,
            "briefing_markdown": briefing_markdown,
            "generated_at": datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
        }

    @classmethod
    def generate_risk_radar(
        cls,
        user_id: int,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Evaluate multi-dimensional risk matrix across attendance, CIE internal marks, fees, and exam eligibility.
        """
        student_ctx = PersonalizationEngine.build_student_context(user_id, db)

        # 1. Course-level attendance risk
        attendances = db.query(Attendance).filter(Attendance.user_id == user_id).all()
        risk_courses = []
        critical_count = 0
        warning_count = 0

        for a in attendances:
            c = db.query(Course).filter(Course.id == a.course_id).first()
            pct = round((a.attended_classes / a.total_classes * 100.0), 2) if a.total_classes > 0 else 100.0
            if pct < 75.0:
                critical_count += 1
                risk_courses.append({
                    "course_code": c.code if c else "COURSE",
                    "course_name": c.title if c else "Course",
                    "percentage": pct,
                    "risk_level": "CRITICAL" if pct < 65.0 else "HIGH",
                    "status": "Ineligible for Exams" if pct < 65.0 else "Condonation Required",
                })
            elif pct < 80.0:
                warning_count += 1
                risk_courses.append({
                    "course_code": c.code if c else "COURSE",
                    "course_name": c.title if c else "Course",
                    "percentage": pct,
                    "risk_level": "MODERATE",
                    "status": "Low Buffer (< 80%)",
                })

        # 2. Calculate overall risk score
        risk_score = 10  # Baseline low risk
        if critical_count > 0:
            risk_score += critical_count * 30
        if warning_count > 0:
            risk_score += warning_count * 15
        if student_ctx.fee_balance > 0:
            risk_score += 25
        if student_ctx.active_backlogs > 0:
            risk_score += student_ctx.active_backlogs * 20

        risk_score = min(100, risk_score)

        if risk_score >= 65:
            overall_risk = "HIGH"
        elif risk_score >= 35:
            overall_risk = "MODERATE"
        else:
            overall_risk = "LOW"

        radar_markdown = (
            f"### 🛡️ Student Academic Risk Radar\n\n"
            f"- **Overall Risk Level**: `{overall_risk}` (Risk Index: **{risk_score}/100**)\n"
            f"- **Critical Attendance Shortages**: `{critical_count}` subject(s)\n"
            f"- **Attendance Warning Thresholds (75–80%)**: `{warning_count}` subject(s)\n"
            f"- **Outstanding Fee Balances**: Rs. {student_ctx.fee_balance:,.2f}\n"
            f"- **Active Backlogs**: {student_ctx.active_backlogs}\n"
        )

        return {
            "student_id": student_ctx.user_id,
            "overall_risk_level": overall_risk,
            "risk_score": risk_score,
            "critical_shortage_count": critical_count,
            "warning_count": warning_count,
            "fee_balance_due": student_ctx.fee_balance,
            "active_backlogs": student_ctx.active_backlogs,
            "at_risk_courses": risk_courses,
            "radar_markdown": radar_markdown,
            "evaluated_at": datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
        }

    @classmethod
    def generate_smart_study_schedule(
        cls,
        user_id: int,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Generate optimized exam preparation timetable based on upcoming exam dates and course credits.
        """
        course_ids = [
            cid for (cid,) in db.query(Attendance.course_id).filter(Attendance.user_id == user_id).all()
        ]
        if not course_ids:
            course_ids = [
                cid for (cid,) in db.query(Enrollment.course_id).filter(Enrollment.user_id == user_id).all()
            ]

        schedules = (
            db.query(ExamSchedule, Course)
            .join(Course, ExamSchedule.course_id == Course.id)
            .filter(Course.id.in_(course_ids))
            .order_by(ExamSchedule.exam_date.asc())
            .all()
        ) if course_ids else []

        plan_items = []
        day_offset = 1
        today = datetime.now(timezone.utc).date()

        for es, c in schedules:
            c_code = c.code
            c_name = c.title
            credits_val = c.credits or 3

            allocated_hours = 3.0 + (credits_val * 0.5)
            study_date = today + timedelta(days=day_offset)
            day_offset += 1

            plan_items.append({
                "date": study_date.strftime("%b %d, %Y"),
                "course_code": c_code,
                "course_name": c_name,
                "target_focus": f"Module 1–3 Core Concepts & Previous Year Papers ({c_code})",
                "recommended_study_hours": allocated_hours,
                "difficulty_weight": "High" if credits_val >= 4 else "Standard",
            })

        schedule_markdown = (
            f"### 📅 AI Smart Revision & Study Schedule\n\n"
            f"Synthesized dynamic revision slots aligned with upcoming semester exam schedules:\n\n"
            f"| Revision Date | Subject Code | Course Name | Recommended Hours | Focus Topics |\n"
            f"| :--- | :--- | :--- | :---: | :--- |\n"
        )
        for item in plan_items:
            schedule_markdown += (
                f"| {item['date']} | `{item['course_code']}` | {item['course_name']} | "
                f"**{item['recommended_study_hours']:.1f} hrs** | {item['target_focus']} |\n"
            )

        return {
            "student_id": user_id,
            "total_study_days": len(plan_items),
            "study_sessions": plan_items,
            "schedule_markdown": schedule_markdown,
            "generated_at": datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
        }
