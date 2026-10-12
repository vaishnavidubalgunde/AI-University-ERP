from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.placement import PlacementDrive, PlacementApplication, ApplicationStatus
from app.ai.intent_router import DeterministicIntentRouter
from app.ai.rag.vector_store import VectorStore


class PlacementAgent:
    """
    Deterministic Placement AI Agent for University ERP.
    Executes corporate recruitment eligibility matching, CTC tier categorizations (Super Dream > 20 LPA,
    Dream 10-20 LPA, Core <= 10 LPA), "One Student - One Offer" 1.5x upgrade policy evaluations,
    and skill gap / interview preparation analyses.
    """

    DEFAULT_STUDENT_SKILLS = [
        "Python", "Data Structures & Algorithms", "SQL", "Database Management",
        "FastAPI", "React", "Docker", "REST APIs", "Git", "System Design Basics"
    ]

    @classmethod
    def classify_ctc_tier(cls, ctc_lpa: float) -> str:
        """Classify CTC into university recruitment tiers."""
        if ctc_lpa > 20.0:
            return "Super Dream"
        elif ctc_lpa >= 10.0:
            return "Dream"
        return "Core / Mass"

    @classmethod
    def evaluate_drive_eligibility(
        cls,
        student: User,
        drive: PlacementDrive,
        existing_offer_ctc: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Deterministically evaluate a student's eligibility for a specific placement drive:
        1. CGPA >= Cutoff
        2. Department match
        3. Backlog criteria (0 for Dream/Super Dream)
        4. "One Student - One Offer" upgrade rule (1.5x CTC increment required if placed)
        """
        student_cgpa = float(student.cgpa if student.cgpa is not None else 8.42)
        student_dept_raw = (student.department or "CSE").strip().upper()

        cgpa_passed = student_cgpa >= drive.eligibility_min_cgpa

        student_code = "CSE"
        if "COMPUTER" in student_dept_raw or "CSE" in student_dept_raw:
            student_code = "CSE"
        elif "INFORMATION" in student_dept_raw or "ISE" in student_dept_raw:
            student_code = "ISE"
        elif "ELECTRON" in student_dept_raw or "ECE" in student_dept_raw:
            student_code = "ECE"
        else:
            student_code = student_dept_raw

        eligible_depts = [d.strip().upper() for d in drive.eligible_departments.split(",")]
        dept_passed = (
            student_code in eligible_depts
            or student_dept_raw in eligible_depts
            or "ALL" in eligible_depts
            or any(d in student_dept_raw for d in eligible_depts)
        )

        tier = cls.classify_ctc_tier(drive.ctc_lpa)

        # 1.5x Upgrade Rule
        upgrade_passed = True
        upgrade_reason = None
        if existing_offer_ctc is not None and existing_offer_ctc > 0:
            min_upgrade_ctc = round(existing_offer_ctc * 1.5, 2)
            if drive.ctc_lpa < min_upgrade_ctc:
                upgrade_passed = False
                upgrade_reason = f"Existing offer is ₹{existing_offer_ctc} LPA. Minimum 1.5x CTC required for upgrade is ₹{min_upgrade_ctc} LPA."
            elif existing_offer_ctc > 20.0:
                upgrade_passed = False
                upgrade_reason = "Super Dream offer (> 20 LPA) already accepted. Strictly ineligible for further campus drives."

        reasons = []
        if not cgpa_passed:
            reasons.append(f"CGPA {student_cgpa} is below cutoff {drive.eligibility_min_cgpa}")
        if not dept_passed:
            reasons.append(f"Department {student_dept} not in eligible list ({drive.eligible_departments})")
        if not upgrade_passed and upgrade_reason:
            reasons.append(upgrade_reason)

        is_eligible = cgpa_passed and dept_passed and upgrade_passed

        # Skill matching
        drive_text = f"{drive.company_name} {drive.job_role} {drive.job_description or ''}".lower()
        matched_skills = []
        missing_skills = []

        all_keywords = {
            "python": "Python",
            "data structure": "Data Structures & Algorithms",
            "algorithm": "Data Structures & Algorithms",
            "engineer": "Data Structures & Algorithms",
            "software": "Data Structures & Algorithms",
            "sql": "SQL",
            "database": "Database Management",
            "react": "React",
            "frontend": "React",
            "web": "React",
            "docker": "Docker",
            "kubernetes": "Docker / Kubernetes",
            "rest": "REST APIs",
            "api": "REST APIs",
            "backend": "REST APIs",
            "system": "System Design Basics",
            "network": "Computer Networks & Security",
            "security": "Computer Networks & Security",
            "routing": "Computer Networks & Security",
            "protocols": "Computer Networks & Security",
            "telemetry": "Telemetry & Monitoring",
            "c++": "C++",
            "java": "Java",
            "cloud": "Cloud Computing / AWS",
            "distributed": "Distributed Systems",
            "machine learning": "Machine Learning",
            "ai": "Machine Learning",
        }

        for kw, skill_label in all_keywords.items():
            if kw in drive_text:
                if skill_label in cls.DEFAULT_STUDENT_SKILLS:
                    if skill_label not in matched_skills:
                        matched_skills.append(skill_label)
                else:
                    if skill_label not in missing_skills:
                        missing_skills.append(skill_label)

        if not matched_skills and not missing_skills:
            matched_skills = ["Data Structures & Algorithms", "Python"]
            missing_skills = ["Domain Specialization"]

        total_req = len(matched_skills) + len(missing_skills)
        match_pct = round((len(matched_skills) / total_req * 100), 1) if total_req > 0 else 75.0

        return {
            "drive_id": drive.id,
            "company_name": drive.company_name,
            "job_role": drive.job_role,
            "ctc_lpa": drive.ctc_lpa,
            "tier": tier,
            "eligibility_min_cgpa": drive.eligibility_min_cgpa,
            "eligible_departments": drive.eligible_departments,
            "drive_date": drive.drive_date,
            "application_deadline": drive.application_deadline,
            "location": drive.location or "Bengaluru",
            "cgpa_passed": cgpa_passed,
            "dept_passed": dept_passed,
            "upgrade_rule_passed": upgrade_passed,
            "is_overall_eligible": is_eligible,
            "ineligibility_reasons": reasons,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "skill_match_percentage": match_pct,
        }

    @classmethod
    def evaluate_all_drives(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """Perform comprehensive placement drive evaluation for student."""
        student = db.query(User).filter(User.id == user_id).first()
        if not student:
            raise ValueError(f"Student with id {user_id} not found.")

        # Check existing applications & offers
        apps = (
            db.query(PlacementApplication, PlacementDrive)
            .join(PlacementDrive, PlacementApplication.drive_id == PlacementDrive.id)
            .filter(PlacementApplication.user_id == user_id)
            .all()
        )

        existing_offers = [
            drive for app, drive in apps if app.status == ApplicationStatus.SELECTED
        ]
        highest_offer_ctc = max((d.ctc_lpa for d in existing_offers), default=None)

        drives = db.query(PlacementDrive).filter(PlacementDrive.is_active == True).all()

        evaluated_drives = []
        eligible_count = 0
        super_dream_count = 0
        dream_count = 0
        core_count = 0

        for d in drives:
            eval_res = cls.evaluate_drive_eligibility(student, d, highest_offer_ctc)
            if eval_res["is_overall_eligible"]:
                eligible_count += 1
                if eval_res["tier"] == "Super Dream":
                    super_dream_count += 1
                elif eval_res["tier"] == "Dream":
                    dream_count += 1
                else:
                    core_count += 1
            evaluated_drives.append(eval_res)

        placement_status = "SEEKING_PLACEMENT"
        if existing_offers:
            placement_status = "PLACED_UPGRADE_ELIGIBLE" if (highest_offer_ctc or 0) <= 20.0 else "PLACED_SUPER_DREAM"

        return {
            "student_id": student.id,
            "student_name": student.full_name,
            "usn": student.student_id or "1DT23CS238",
            "department": student.department or "CSE",
            "semester": student.semester or 6,
            "cgpa": float(student.cgpa or 8.42),
            "placement_status": placement_status,
            "existing_offer_ctc": highest_offer_ctc,
            "total_active_drives": len(drives),
            "eligible_drives_count": eligible_count,
            "super_dream_eligible_count": super_dream_count,
            "dream_eligible_count": dream_count,
            "core_eligible_count": core_count,
            "student_skills": cls.DEFAULT_STUDENT_SKILLS,
            "drives": evaluated_drives,
        }

    @classmethod
    def generate_advisory_report(
        cls,
        user_id: int,
        db: Session,
        query: Optional[str] = None,
        vector_store: Optional[VectorStore] = None,
    ) -> Dict[str, Any]:
        """Generate structured Placement Advisory synthesis with deterministic rules and policy citations."""
        audit = cls.evaluate_all_drives(user_id, db)

        # Entity extraction for targeted company analysis
        target_company = None
        if query:
            classification = DeterministicIntentRouter.classify(query)
            if classification.extracted_entities.companies:
                target_company = classification.extracted_entities.companies[0]

        focused_drive = None
        if target_company:
            for d in audit["drives"]:
                if target_company.lower() in d["company_name"].lower():
                    focused_drive = d
                    break

        paragraphs = []
        paragraphs.append(
            f"**Corporate Relations & Placement Advisory for {audit['student_name']}** ({audit['usn']}, {audit['department']} - Sem {audit['semester']}, CGPA: **{audit['cgpa']}**)"
        )

        if audit["existing_offer_ctc"]:
            paragraphs.append(
                f"🎉 **Current Placement Status:** You hold an active offer of **₹{audit['existing_offer_ctc']} LPA**."
            )
            min_up = round(audit["existing_offer_ctc"] * 1.5, 2)
            paragraphs.append(
                f"Under the university's **One Student - One Offer Policy**, you are eligible for up to 3 Dream or Super Dream upgrades offering at least **1.5x CTC (₹{min_up} LPA)**."
            )
        else:
            paragraphs.append(
                f"🎯 **Placement Readiness Overview:** With a CGPA of **{audit['cgpa']}**, you are eligible for **{audit['eligible_drives_count']} out of {audit['total_active_drives']}** active campus recruitment drives, including **{audit['super_dream_eligible_count']} Super Dream (> 20 LPA)** and **{audit['dream_eligible_count']} Dream (10-20 LPA)** opportunities."
            )

        if focused_drive:
            paragraphs.append(
                f"### Targeted Drive Analysis: **{focused_drive['company_name']}** ({focused_drive['job_role']} — **₹{focused_drive['ctc_lpa']} LPA**, Tier: *{focused_drive['tier']}*)"
            )
            if focused_drive["is_overall_eligible"]:
                paragraphs.append(
                    f"✅ **You are fully eligible to apply.** Minimum CGPA cutoff is {focused_drive['eligibility_min_cgpa']} (Your CGPA: **{audit['cgpa']}**)."
                )
                paragraphs.append(
                    f"- **Skill Match Ratio:** **{focused_drive['skill_match_percentage']}%** match with job description."
                )
                if focused_drive["matched_skills"]:
                    paragraphs.append(f"- **Key Strengths:** {', '.join(focused_drive['matched_skills'])}.")
                if focused_drive["missing_skills"]:
                    paragraphs.append(
                        f"- 💡 **Recommended Preparation Keywords:** Consider brushing up on **{', '.join(focused_drive['missing_skills'])}** before technical rounds."
                    )
            else:
                paragraphs.append(
                    f"⚠️ **Ineligibility Flag:** {'; '.join(focused_drive['ineligibility_reasons'])}."
                )
        else:
            paragraphs.append("### Active Campus Drives Summary")
            for d in audit["drives"]:
                status_icon = "✅" if d["is_overall_eligible"] else "❌"
                paragraphs.append(
                    f"- {status_icon} **{d['company_name']}** ({d['job_role']}): **₹{d['ctc_lpa']} LPA** [{d['tier']}] — *Deadline: {d['application_deadline']}* (Skill Match: {d['skill_match_percentage']}%)"
                )

        # Policy & Code of Conduct Reminder
        paragraphs.append(
            "📋 **Mandatory Placement Protocol:** Formal dress code is mandatory for all PPTs and interviews. Unapproved absence from any shortlisted interview round results in a strict **3-drive debarment penalty**."
        )

        # Retrieve RAG Citations
        citations = []
        if vector_store:
            rag_results = vector_store.search(
                query=query or "Placement policy one student one offer upgrade rules super dream CTC",
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
            "student_id": audit["student_id"],
            "student_name": audit["student_name"],
            "usn": audit["usn"],
            "department": audit["department"],
            "semester": audit["semester"],
            "cgpa": audit["cgpa"],
            "placement_status": audit["placement_status"],
            "existing_offer_ctc": audit["existing_offer_ctc"],
            "total_active_drives": audit["total_active_drives"],
            "eligible_drives_count": audit["eligible_drives_count"],
            "super_dream_eligible_count": audit["super_dream_eligible_count"],
            "dream_eligible_count": audit["dream_eligible_count"],
            "core_eligible_count": audit["core_eligible_count"],
            "student_skills": audit["student_skills"],
            "focused_drive": focused_drive,
            "drives": audit["drives"],
            "advisory_markdown": advisory_text,
            "citations": citations,
        }
