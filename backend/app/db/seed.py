import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure project backend directory in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User,
    UserRole,
    Department,
    Course,
    CourseType,
    Enrollment,
    Attendance,
    InternalMark,
    ExamSchedule,
    HallTicket,
    FeeRecord,
    FeeCategory,
    FeeStatus,
    Notice,
    NoticeCategory,
    NoticePriority,
    PlacementDrive,
    PlacementApplication,
    ApplicationStatus,
    Grievance,
    GrievanceCategory,
    GrievanceStatus,
    ChatSession,
    ChatMessage,
    SenderType,
    QueryIntent,
)


def seed_database():
    """Wipe and re-seed database with rich, realistic university data."""
    print("[+] Initializing clean database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[*] Seeding academic departments...")
        dept_cse = Department(code="CSE", name="Computer Science & Engineering", building="Turing Block, 4th Floor", hod_name="Dr. Rajesh Sharma")
        dept_ise = Department(code="ISE", name="Information Science & Engineering", building="Shannon Block, 3rd Floor", hod_name="Dr. Priya Nair")
        dept_ece = Department(code="ECE", name="Electronics & Communication Engineering", building="Bose Block, 2nd Floor", hod_name="Dr. Anand Murthy")
        db.add_all([dept_cse, dept_ise, dept_ece])
        db.commit()

        print("[*] Seeding university courses...")
        courses = [
            Course(code="CS601", title="Distributed Cloud Systems", department_id=dept_cse.id, semester=6, credits=4, course_type=CourseType.CORE, syllabus_summary="Consensus algorithms, MapReduce, Raft, Distributed Storage, AWS/GCP architecture.", faculty_name="Dr. Rajesh Sharma"),
            Course(code="CS602", title="Natural Language Processing & GenAI", department_id=dept_cse.id, semester=6, credits=4, course_type=CourseType.CORE, syllabus_summary="Transformers, Attention Mechanisms, Tokenization, LLMs, RAG vector architectures.", faculty_name="Prof. Sneha Rao"),
            Course(code="CS603", title="Compiler Design & Optimization", department_id=dept_cse.id, semester=6, credits=4, course_type=CourseType.CORE, syllabus_summary="Lexical analysis, AST generation, LL/LR parsing, Intermediate code generation, Register allocation.", faculty_name="Dr. Vikram Joshi"),
            Course(code="CS604", title="Machine Learning Laboratory", department_id=dept_cse.id, semester=6, credits=2, course_type=CourseType.LAB, syllabus_summary="Scikit-Learn, PyTorch, Model fine-tuning, Vector databases, Embedding pipelines.", faculty_name="Prof. Sneha Rao"),
            Course(code="CS605", title="Enterprise Software Architecture", department_id=dept_cse.id, semester=6, credits=3, course_type=CourseType.ELECTIVE, syllabus_summary="Microservices, Domain-Driven Design, Event Sourcing, CI/CD, Containerization.", faculty_name="Prof. Arvind Swamy"),
            Course(code="CS606", title="Cyber Security & Applied Cryptography", department_id=dept_cse.id, semester=6, credits=3, course_type=CourseType.ELECTIVE, syllabus_summary="Public key cryptography, Zero-knowledge proofs, Network intrusion detection, RBAC.", faculty_name="Dr. Anand Murthy"),
            Course(code="CS701", title="Web Technology & Full Stack Engineering", department_id=dept_cse.id, semester=7, credits=4, course_type=CourseType.CORE, syllabus_summary="Modern Web Standards, Micro-frontends, WebSockets, SSR, REST/GraphQL APIs.", faculty_name="Dr. Rajesh Sharma"),
            Course(code="CS702", title="Big Data Analytics & Stream Processing", department_id=dept_cse.id, semester=7, credits=4, course_type=CourseType.CORE, syllabus_summary="Apache Spark, Kafka, Distributed Stream Pipelines, Data Lakes.", faculty_name="Prof. Sneha Rao"),
            Course(code="IS601", title="Data Mining & Warehousing", department_id=dept_ise.id, semester=6, credits=4, course_type=CourseType.CORE, syllabus_summary="ETL pipelines, Snowflake, Data modeling, OLAP cubes.", faculty_name="Dr. Priya Nair"),
            Course(code="EC601", title="VLSI Design & Embedded Systems", department_id=dept_ece.id, semester=6, credits=4, course_type=CourseType.CORE, syllabus_summary="FPGA architecture, Verilog HDL, CMOS layout design.", faculty_name="Dr. Anand Murthy"),
        ]
        db.add_all(courses)
        db.commit()

        print("[*] Seeding users & student profiles...")
        # 1. Student Alex Kumar (CSE Sem 6 Sec A)
        alex = User(
            email="alex.kumar@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Alex Kumar",
            role=UserRole.STUDENT,
            department="Computer Science & Engineering",
            student_id="1DT23CS238",
            semester=6,
            section="A",
            cgpa=9.24,
            is_active=True,
        )
        # 2. Student Priya Varadarajan (CSE Sem 6 Sec A)
        priya = User(
            email="priya.v@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Priya Varadarajan",
            role=UserRole.STUDENT,
            department="Computer Science & Engineering",
            student_id="1DT23CS078",
            semester=6,
            section="A",
            cgpa=8.85,
            is_active=True,
        )
        # 3. Student Rohan Patel (CSE Sem 7 Sec D)
        rohan = User(
            email="rohan.patel@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Rohan Patel",
            role=UserRole.STUDENT,
            department="Computer Science & Engineering",
            student_id="1DT22CS142",
            semester=7,
            section="D",
            cgpa=7.95,
            is_active=True,
        )
        # 4. Student Ananya Roy (CSE Sem 7 Sec D)
        ananya = User(
            email="ananya.roy@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Ananya Roy",
            role=UserRole.STUDENT,
            department="Computer Science & Engineering",
            student_id="1DT22CS019",
            semester=7,
            section="D",
            cgpa=9.12,
            is_active=True,
        )
        # 5. Student Vikram Deshmukh (CSE Sem 6 Sec B) - Attendance Shortage student
        vikram = User(
            email="vikram.d@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Vikram Deshmukh",
            role=UserRole.STUDENT,
            department="Computer Science & Engineering",
            student_id="1DT23CS189",
            semester=6,
            section="B",
            cgpa=6.42,
            is_active=True,
        )
        # 6. Student Sneha Hegde (ISE Sem 6 Sec A)
        sneha_h = User(
            email="sneha.h@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Sneha Hegde",
            role=UserRole.STUDENT,
            department="Information Science & Engineering",
            student_id="1DT23IS054",
            semester=6,
            section="A",
            cgpa=8.60,
            is_active=True,
        )
        # 7. Student Rahul Verma (ECE Sem 6 Sec B)
        rahul_v = User(
            email="rahul.v@univ.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Rahul Verma",
            role=UserRole.STUDENT,
            department="Electronics & Communication Engineering",
            student_id="1DT23EC088",
            semester=6,
            section="B",
            cgpa=7.40,
            is_active=True,
        )
        # Faculty Dr. Rajesh Sharma
        faculty_sharma = User(
            email="dr.sharma@univ.edu",
            hashed_password=get_password_hash("faculty123"),
            full_name="Dr. Rajesh Sharma",
            role=UserRole.FACULTY,
            department="Computer Science & Engineering",
            is_active=True,
        )
        # Faculty Prof. Sneha Rao
        faculty_sneha = User(
            email="sneha.rao@univ.edu",
            hashed_password=get_password_hash("faculty123"),
            full_name="Prof. Sneha Rao",
            role=UserRole.FACULTY,
            department="Computer Science & Engineering",
            is_active=True,
        )
        # Admin Director
        admin = User(
            email="admin@univ.edu",
            hashed_password=get_password_hash("admin123"),
            full_name="Dr. H. V. Venkatesh",
            role=UserRole.ADMIN,
            department="Office of Academic Affairs",
            is_active=True,
        )
        db.add_all([alex, priya, rohan, ananya, vikram, sneha_h, rahul_v, faculty_sharma, faculty_sneha, admin])
        db.commit()

        print("[*] Seeding course enrollments, attendance & marks...")
        # Enroll Alex
        for c in courses[:5]:
            enrollment = Enrollment(user_id=alex.id, course_id=c.id, academic_year="2026-2027", semester=6, grade="A+", grade_points=9.2)
            db.add(enrollment)
        # Enroll Priya
        for c in courses[:5]:
            enrollment = Enrollment(user_id=priya.id, course_id=c.id, academic_year="2026-2027", semester=6, grade="A", grade_points=8.8)
            db.add(enrollment)
        # Enroll Vikram
        for c in courses[:4]:
            enrollment = Enrollment(user_id=vikram.id, course_id=c.id, academic_year="2026-2027", semester=6, grade="C", grade_points=6.0)
            db.add(enrollment)
        # Enroll Rohan & Ananya in Sem 7 courses
        for c in [courses[6], courses[7]]:
            db.add(Enrollment(user_id=rohan.id, course_id=c.id, academic_year="2026-2027", semester=7, grade="B+", grade_points=8.0))
            db.add(Enrollment(user_id=ananya.id, course_id=c.id, academic_year="2026-2027", semester=7, grade="A+", grade_points=9.5))
        # Enroll Sneha in ISE course
        db.add(Enrollment(user_id=sneha_h.id, course_id=courses[8].id, academic_year="2026-2027", semester=6, grade="A", grade_points=8.6))
        # Enroll Rahul in ECE course
        db.add(Enrollment(user_id=rahul_v.id, course_id=courses[9].id, academic_year="2026-2027", semester=6, grade="B", grade_points=7.4))

        # Attendance for Alex
        db.add_all([
            Attendance(user_id=alex.id, course_id=courses[0].id, total_classes=36, attended_classes=32),  # 88.9%
            Attendance(user_id=alex.id, course_id=courses[1].id, total_classes=34, attended_classes=24),  # 70.6% (Warning)
            Attendance(user_id=alex.id, course_id=courses[2].id, total_classes=38, attended_classes=36),  # 94.7%
            Attendance(user_id=alex.id, course_id=courses[3].id, total_classes=14, attended_classes=14),  # 100%
            Attendance(user_id=alex.id, course_id=courses[4].id, total_classes=30, attended_classes=27),  # 90.0%
        ])

        # Attendance for Priya
        db.add_all([
            Attendance(user_id=priya.id, course_id=courses[0].id, total_classes=36, attended_classes=33),  # 91.7%
            Attendance(user_id=priya.id, course_id=courses[1].id, total_classes=34, attended_classes=31),  # 91.2%
            Attendance(user_id=priya.id, course_id=courses[2].id, total_classes=38, attended_classes=35),  # 92.1%
            Attendance(user_id=priya.id, course_id=courses[3].id, total_classes=14, attended_classes=13),  # 92.9%
            Attendance(user_id=priya.id, course_id=courses[4].id, total_classes=30, attended_classes=28),  # 93.3%
        ])

        # Attendance for Vikram (Shortage Case)
        db.add_all([
            Attendance(user_id=vikram.id, course_id=courses[0].id, total_classes=36, attended_classes=22),  # 61.1% (Critical Shortage)
            Attendance(user_id=vikram.id, course_id=courses[1].id, total_classes=34, attended_classes=21),  # 61.8% (Critical Shortage)
            Attendance(user_id=vikram.id, course_id=courses[2].id, total_classes=38, attended_classes=25),  # 65.8% (Shortage)
            Attendance(user_id=vikram.id, course_id=courses[3].id, total_classes=14, attended_classes=8),   # 57.1% (Critical Shortage)
        ])

        # Attendance for Rohan & Ananya (Sem 7 Sec D)
        db.add_all([
            Attendance(user_id=rohan.id, course_id=courses[6].id, total_classes=32, attended_classes=26),  # 81.3%
            Attendance(user_id=rohan.id, course_id=courses[7].id, total_classes=30, attended_classes=25),  # 83.3%
            Attendance(user_id=ananya.id, course_id=courses[6].id, total_classes=32, attended_classes=31), # 96.9%
            Attendance(user_id=ananya.id, course_id=courses[7].id, total_classes=30, attended_classes=29), # 96.7%
        ])

        # Attendance for Sneha & Rahul
        db.add_all([
            Attendance(user_id=sneha_h.id, course_id=courses[8].id, total_classes=35, attended_classes=31), # 88.6%
            Attendance(user_id=rahul_v.id, course_id=courses[9].id, total_classes=36, attended_classes=28), # 77.8%
        ])

        # Internal Assessment Marks
        marks = [
            InternalMark(user_id=alex.id, course_id=courses[0].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=46.5),
            InternalMark(user_id=alex.id, course_id=courses[0].id, assessment_name="Internal Assessment 2", max_marks=50, obtained_marks=44.0),
            InternalMark(user_id=alex.id, course_id=courses[1].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=42.0),
            InternalMark(user_id=alex.id, course_id=courses[1].id, assessment_name="Internal Assessment 2", max_marks=50, obtained_marks=40.5),
            InternalMark(user_id=alex.id, course_id=courses[2].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=48.0),
            InternalMark(user_id=alex.id, course_id=courses[2].id, assessment_name="Internal Assessment 2", max_marks=50, obtained_marks=47.5),
            InternalMark(user_id=alex.id, course_id=courses[3].id, assessment_name="Lab Practical Exam", max_marks=50, obtained_marks=49.0),
            InternalMark(user_id=alex.id, course_id=courses[4].id, assessment_name="Mini-Project Evaluation", max_marks=50, obtained_marks=48.5),
            
            # Priya's Marks
            InternalMark(user_id=priya.id, course_id=courses[0].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=44.0),
            InternalMark(user_id=priya.id, course_id=courses[0].id, assessment_name="Internal Assessment 2", max_marks=50, obtained_marks=45.0),
            InternalMark(user_id=priya.id, course_id=courses[1].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=43.0),
            InternalMark(user_id=priya.id, course_id=courses[2].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=46.0),

            # Vikram's Marks (At-Risk)
            InternalMark(user_id=vikram.id, course_id=courses[0].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=21.0),
            InternalMark(user_id=vikram.id, course_id=courses[0].id, assessment_name="Internal Assessment 2", max_marks=50, obtained_marks=19.5),
            InternalMark(user_id=vikram.id, course_id=courses[1].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=22.0),
            InternalMark(user_id=vikram.id, course_id=courses[2].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=20.0),

            # Rohan & Ananya (Sem 7)
            InternalMark(user_id=rohan.id, course_id=courses[6].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=38.0),
            InternalMark(user_id=rohan.id, course_id=courses[7].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=39.5),
            InternalMark(user_id=ananya.id, course_id=courses[6].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=48.5),
            InternalMark(user_id=ananya.id, course_id=courses[7].id, assessment_name="Internal Assessment 1", max_marks=50, obtained_marks=49.0),
        ]
        db.add_all(marks)
        db.commit()

        print("[*] Seeding exam schedules & hall ticket...")
        exams = [
            ExamSchedule(course_id=courses[0].id, exam_name="Mid-Semester Examination 2", exam_date="2026-03-06", time_slot="10:00 AM - 01:00 PM", room_number="Hall 402, Block A", max_marks=100),
            ExamSchedule(course_id=courses[1].id, exam_name="Mid-Semester Examination 2", exam_date="2026-03-09", time_slot="10:00 AM - 01:00 PM", room_number="Hall 402, Block A", max_marks=100),
            ExamSchedule(course_id=courses[2].id, exam_name="Mid-Semester Examination 2", exam_date="2026-03-12", time_slot="02:00 PM - 05:00 PM", room_number="Hall 405, Block A", max_marks=100),
            ExamSchedule(course_id=courses[3].id, exam_name="Lab Examination", exam_date="2026-03-16", time_slot="09:00 AM - 12:00 PM", room_number="AI Lab 2", max_marks=50),
            ExamSchedule(course_id=courses[4].id, exam_name="Mid-Semester Examination 2", exam_date="2026-03-19", time_slot="10:00 AM - 01:00 PM", room_number="Hall 402, Block A", max_marks=100),
        ]
        db.add_all(exams)

        hall_ticket = HallTicket(
            user_id=alex.id,
            semester=6,
            academic_year="2026-2027",
            is_eligible=True,
            qr_token=str(uuid.uuid4()),
        )
        db.add(hall_ticket)
        db.commit()

        print("[*] Seeding fee records & receipts...")
        fee_tuition = FeeRecord(
            user_id=alex.id,
            academic_year="2026-2027",
            semester=6,
            category=FeeCategory.TUITION,
            total_amount=65000.0,
            paid_amount=65000.0,
            status=FeeStatus.PAID,
            due_date="2026-02-15",
            receipt_number="REC-2026-98124",
            payment_date=datetime.now(timezone.utc),
            transaction_ref="TXN-SBI-89217462",
        )
        fee_exam = FeeRecord(
            user_id=alex.id,
            academic_year="2026-2027",
            semester=6,
            category=FeeCategory.EXAMINATION,
            total_amount=3500.0,
            paid_amount=3500.0,
            status=FeeStatus.PAID,
            due_date="2026-02-28",
            receipt_number="REC-2026-98125",
            payment_date=datetime.now(timezone.utc),
            transaction_ref="TXN-HDFC-1092847",
        )
        db.add_all([fee_tuition, fee_exam])
        db.commit()

        print("[*] Seeding university circulars & notice board...")
        notices = [
            Notice(
                title="Academic Calendar & Elective Selection Guidelines",
                content="Course registration for Semester 7 electives opens on March 15. All eligible students must review the curriculum prerequisites before finalizing selections.",
                category=NoticeCategory.ACADEMIC,
                priority=NoticePriority.HIGH,
                published_by="Dean of Academic Affairs",
                is_pinned=True,
            ),
            Notice(
                title="Mid-Semester Examination 2 Schedule Released",
                content="The timetable for the Mid-Semester 2 examinations for the Spring 2026 session is now available on the portal. Students must ensure minimum 75% attendance to download their hall tickets.",
                category=NoticeCategory.EXAMINATION,
                priority=NoticePriority.HIGH,
                published_by="Controller of Examinations",
                is_pinned=True,
            ),
            Notice(
                title="Google India Campus Recruitment Drive 2026",
                content="Google India is visiting campus for SDE-1 hiring. Eligible branches: CSE, ISE, ECE with CGPA >= 8.0 and zero active backlogs. Apply before March 25, 2026.",
                category=NoticeCategory.PLACEMENT,
                priority=NoticePriority.HIGH,
                published_by="Department of Training & Placements",
                is_pinned=True,
            ),
            Notice(
                title="HackUniv 2026 Annual Technical Hackathon",
                content="Registrations are open for the 36-hour National Level Hackathon with Rs 3,00,000 prize pool. Tracks include Generative AI, Cloud Systems, and Decentralized Finance.",
                category=NoticeCategory.EVENTS,
                priority=NoticePriority.NORMAL,
                published_by="Student Affairs Council",
            ),
            Notice(
                title="Hostel Mess Committee Monthly Review",
                content="The monthly review meeting will take place in the Main Seminar Hall on Saturday at 4:00 PM.",
                category=NoticeCategory.GENERAL,
                priority=NoticePriority.LOW,
                published_by="Chief Warden Office",
            ),
        ]
        db.add_all(notices)
        db.commit()

        print("[*] Seeding placement recruitment drives...")
        drives = [
            PlacementDrive(
                company_name="Google India",
                job_role="Software Development Engineer (SDE-1)",
                ctc_lpa=24.5,
                eligibility_min_cgpa=8.0,
                eligible_departments="CSE, ISE, ECE",
                max_backlogs=0,
                drive_date="2026-04-15",
                application_deadline="2026-03-25",
                location="Bengaluru, Karnataka",
                job_description="Developing large-scale distributed systems and cloud infrastructure.",
            ),
            PlacementDrive(
                company_name="Microsoft",
                job_role="Software Engineer (Cloud & AI)",
                ctc_lpa=22.0,
                eligibility_min_cgpa=7.5,
                eligible_departments="CSE, ISE",
                max_backlogs=0,
                drive_date="2026-04-20",
                application_deadline="2026-03-28",
                location="Hyderabad / Bengaluru",
                job_description="Azure AI platform engineering, semantic kernel pipelines.",
            ),
            PlacementDrive(
                company_name="Cisco Systems",
                job_role="Network Systems & Security Engineer",
                ctc_lpa=17.5,
                eligibility_min_cgpa=7.0,
                eligible_departments="CSE, ISE, ECE",
                max_backlogs=1,
                drive_date="2026-04-28",
                application_deadline="2026-04-05",
                location="Bengaluru",
                job_description="Core routing, secure networking protocols, telemetry pipelines.",
            ),
        ]
        db.add_all(drives)
        db.commit()

        # Alex applied to Google
        alex_app = PlacementApplication(
            user_id=alex.id,
            drive_id=drives[0].id,
            status=ApplicationStatus.SHORTLISTED,
            interview_date="2026-04-15",
            feedback_notes="Resume shortlisted based on 9.24 CGPA and ML projects.",
        )
        db.add(alex_app)
        db.commit()

        print("[*] Seeding support grievances...")
        grievance = Grievance(
            ticket_number="GRV-2026-0042",
            user_id=alex.id,
            category=GrievanceCategory.ACADEMIC,
            subject="Discrepancy in CS601 IA-1 Marksheet Entry",
            description="My paper scored 46.5/50 but ERP portal initially recorded 42/50.",
            status=GrievanceStatus.RESOLVED,
            assigned_to="Dr. Rajesh Sharma",
            resolution_notes="Paper verified and ERP database score corrected to 46.5/50.",
            resolved_at=datetime.now(timezone.utc),
        )
        db.add(grievance)
        db.commit()

        print("[*] Seeding AI conversational memory session...")
        chat_session = ChatSession(
            session_uuid=str(uuid.uuid4()),
            user_id=alex.id,
            title="Attendance & Exam Eligibility Inquiry",
        )
        db.add(chat_session)
        db.commit()

        msg_1 = ChatMessage(
            session_id=chat_session.id,
            sender=SenderType.USER,
            content="What is my attendance in CS602 Natural Language Processing, and am I allowed to write the exam?",
            language="en",
        )
        msg_2 = ChatMessage(
            session_id=chat_session.id,
            sender=SenderType.AI_AGENT,
            agent_name="Academic & Exam Agent",
            intent=QueryIntent.ACADEMIC,
            content="Alex, your current attendance in CS602: Natural Language Processing is 70.6% (24 attended out of 34 classes).\n\nAction Required: This is currently below the mandatory 75.0% threshold. According to University Regulation Sec 4.2, you need to attend the next 6 consecutive lectures without missing any to restore your attendance to 75.0% before the hall ticket freeze date on March 1st.",
            sources_json='[{"document": "Academic_Regulations_2026.pdf", "page": 14, "section": "4.2 Minimum Attendance"}]',
            language="en",
        )
        db.add_all([msg_1, msg_2])
        db.commit()

        print("[+] Database seed completed successfully!")
        print(f"[=] Summary: {db.query(Department).count()} Departments, {db.query(Course).count()} Courses, {db.query(User).count()} Users, {db.query(Attendance).count()} Attendance records, {db.query(Notice).count()} Notices, {db.query(PlacementDrive).count()} Placement Drives.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
