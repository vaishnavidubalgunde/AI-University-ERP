from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class RAGSearchResultItem(BaseModel):
    chunk_id: str
    document_title: str
    filename: str
    section_title: str
    text: str
    similarity_score: float
    citation: str
    page_number: Optional[int] = None
    has_table: Optional[bool] = False


class RAGSearchResponse(BaseModel):
    query: str
    results_count: int
    results: List[RAGSearchResultItem]


class RAGIngestResponse(BaseModel):
    success: bool
    total_documents: int
    total_chunks: int
    message: str


class ChatMessageItem(BaseModel):
    id: int
    sender: str
    agent_name: Optional[str] = None
    intent: Optional[str] = None
    content: str
    sources: Optional[List[RAGSearchResultItem]] = None
    document_id: Optional[int] = None
    page_references: Optional[List[int]] = None
    feedback: Optional[str] = None
    language: Optional[str] = "en"
    created_at: Any


class ChatSessionItem(BaseModel):
    session_uuid: str
    title: str
    active_document_id: Optional[int] = None
    active_document_title: Optional[str] = None
    created_at: Any
    updated_at: Any
    message_count: int


class SendMessageRequest(BaseModel):
    session_uuid: Optional[str] = None
    message: str
    active_document_id: Optional[int] = None
    agent_type: Optional[str] = "general"
    language: Optional[str] = None


class SendMessageResponse(BaseModel):
    session_uuid: str
    user_message: ChatMessageItem
    ai_message: ChatMessageItem
    active_document_id: Optional[int] = None
    active_document_title: Optional[str] = None
    detected_language: Optional[str] = None
    intent: Optional[str] = None
    confidence: Optional[float] = None


class CreateSessionResponse(BaseModel):
    session_uuid: str
    title: str
    active_document_id: Optional[int] = None
    created_at: Any


# --- Document Intelligence Schemas ---

class FactItem(BaseModel):
    text: str
    page_number: int
    section: Optional[str] = "General"
    category: Optional[str] = None


class TableInfo(BaseModel):
    title: Optional[str] = "Table"
    page_number: int
    headers: List[str] = []
    rows: List[List[str]] = []
    raw_markdown: Optional[str] = None


class DocumentAnalysisSchema(BaseModel):
    title: str
    total_pages: int
    document_type: str
    academic_year: str
    executive_summary: str
    document_structure: List[str]
    key_points: List[FactItem]
    important_rules: List[FactItem]
    important_dates: List[FactItem]
    eligibility_requirements: List[FactItem]
    important_definitions: List[FactItem]
    notable_changes: List[FactItem]
    document_conclusion: str
    extracted_tables: List[TableInfo] = []
    summary_markdown: str


class DocumentItem(BaseModel):
    id: int
    doc_uuid: str
    title: str
    original_filename: str
    file_size_formatted: str
    mime_type: str
    category: str
    total_pages: int
    pages_processed: int
    status: str
    error_message: Optional[str] = None
    is_scanned: bool
    ocr_performed: bool
    ocr_confidence: float
    version: Optional[str] = "1.0"
    academic_year: Optional[str] = "2025-26"
    is_public: bool
    created_at: str
    updated_at: str


class DocumentStatusResponse(BaseModel):
    doc_id: int
    doc_uuid: str
    status: str
    progress_percentage: int
    current_step: str
    total_pages: int
    pages_completed: int
    error_message: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    success: bool
    doc_id: int
    doc_uuid: str
    title: str
    total_pages: int
    status: str
    message: str
    overview: Optional[Dict[str, Any]] = None
    analysis: Optional[DocumentAnalysisSchema] = None


class DocumentDetailResponse(BaseModel):
    id: int
    doc_uuid: str
    title: str
    original_filename: str
    file_size_formatted: str
    category: str
    total_pages: int
    pages_processed: int
    status: str
    is_scanned: bool
    ocr_performed: bool
    ocr_confidence: float
    version: Optional[str] = "1.0"
    academic_year: Optional[str] = "2025-26"
    summary: Optional[str] = None
    overview: Optional[Dict[str, Any]] = None
    analysis: Optional[DocumentAnalysisSchema] = None
    created_at: str


class DocumentSummaryRequest(BaseModel):
    summary_mode: str = "detailed"  # quick, detailed, sections, rules, dates, study_notes, analysis


class DocumentSummaryResponse(BaseModel):
    doc_id: int
    doc_title: str
    summary_mode: str
    summary_markdown: str
    questions: Optional[List[str]] = []
    mcqs: Optional[List[Dict[str, Any]]] = []


class DocumentPageItem(BaseModel):
    page_number: int
    text: str
    word_count: int
    headings: List[str] = []
    has_tables: bool = False
    tables: List[Dict[str, Any]] = []


# --- Document Comparison Schemas ---

class ComparisonTableItem(BaseModel):
    category: str
    old_value: str
    new_value: str
    change_type: str  # "MODIFIED", "NEW", "REMOVED", "UNCHANGED"
    old_page: Optional[int] = None
    new_page: Optional[int] = None
    description: str


class DocumentComparisonRequest(BaseModel):
    doc_a_id: int  # Old / Baseline Document
    doc_b_id: int  # New / Revised Document


class DocumentComparisonResponse(BaseModel):
    comparison_uuid: str
    doc_a_id: int
    doc_a_title: str
    doc_a_version: str
    doc_b_id: int
    doc_b_title: str
    doc_b_version: str
    is_identical: bool
    summary_of_major_changes: List[str]
    changed_rules: List[ComparisonTableItem]
    changed_dates: List[ComparisonTableItem]
    changed_requirements: List[ComparisonTableItem]
    new_items: List[ComparisonTableItem]
    removed_items: List[ComparisonTableItem]
    modified_items: List[ComparisonTableItem]
    unchanged_items: List[ComparisonTableItem]
    comparison_matrix: List[ComparisonTableItem]
    comparison_markdown: str
    created_at: str


class MessageFeedbackRequest(BaseModel):
    feedback: str  # 'like', 'dislike', 'none'


# --- Phase 13: Intent Routing Schemas ---

class ExtractedEntitiesSchema(BaseModel):
    course_codes: List[str] = []
    companies: List[str] = []
    percentages: List[str] = []
    semesters: List[int] = []
    cgpa: Optional[float] = None
    dates: List[str] = []


class SecondaryIntentSchema(BaseModel):
    intent: str
    score: float
    agent: str


class IntentClassifyRequest(BaseModel):
    query: str


class IntentClassifyResponse(BaseModel):
    query: str
    primary_intent: str
    confidence: float
    secondary_intents: List[SecondaryIntentSchema] = []
    is_compound_query: bool = False
    recommended_agent: str
    extracted_entities: ExtractedEntitiesSchema


# --- Phase 14: Academic Agent Schemas ---

class CourseAttendanceAnalysisSchema(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    credits: int
    faculty_name: str
    attended_classes: int
    total_classes: int
    percentage: float
    has_shortage: bool
    consecutive_classes_needed_for_75: int
    safe_missable_classes: int
    condonation_status: str


class AttendanceSummarySchema(BaseModel):
    average_attendance: float
    total_courses: int
    shortage_courses_count: int
    condonation_eligible_count: int
    critical_shortage_count: int
    is_overall_eligible_for_exams: bool
    courses: List[CourseAttendanceAnalysisSchema]


class CourseCIEMarksAnalysisSchema(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    test1: float
    test2: float
    quiz: float
    assignment: float
    total_cie: float
    max_cie: float
    is_cie_eligible_for_see: bool
    see_min_marks_needed_out_of_50: float


class CIEMarksSummarySchema(BaseModel):
    average_cie_marks: float
    total_evaluated_courses: int
    cie_cleared_count: int
    cie_failed_count: int
    courses: List[CourseCIEMarksAnalysisSchema]


class AcademicAdvisoryRequest(BaseModel):
    query: Optional[str] = None


class AcademicAdvisoryResponse(BaseModel):
    student_id: int
    student_name: str
    usn: str
    department: str
    semester: int
    cgpa: float
    attendance_analysis: AttendanceSummarySchema
    cie_marks_analysis: CIEMarksSummarySchema
    focused_course: Optional[CourseAttendanceAnalysisSchema] = None
    advisory_markdown: str
    citations: List[RAGSearchResultItem]


# --- Phase 15: Examination Agent Schemas ---

class CourseExamEligibilitySchema(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    credits: int
    attendance_percentage: float
    attendance_eligible: bool
    is_condonation_applicable: bool
    cie_marks: float
    cie_eligible: bool
    is_course_eligible: bool
    remarks: str


class ExamEligibilitySummarySchema(BaseModel):
    overall_status: str
    is_overall_eligible: bool
    fee_balance_due: float
    fee_clearance_passed: bool
    total_courses: int
    eligible_courses_count: int
    condonation_pending_count: int
    ineligible_courses_count: int
    courses: List[CourseExamEligibilitySchema]


class ExamScheduleItemSchema(BaseModel):
    schedule_id: int
    course_id: int
    course_code: str
    course_name: str
    exam_name: str
    exam_date: str
    time_slot: str
    room_number: str
    max_marks: float
    days_remaining: int
    status: str


class HallTicketStatusSchema(BaseModel):
    has_hall_ticket: bool
    hall_ticket_id: Optional[int] = None
    usn: Optional[str] = None
    student_name: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    is_eligible: Optional[bool] = None
    status: str
    ineligibility_reason: Optional[str] = None
    qr_token: Optional[str] = None
    cryptographic_signature: Optional[str] = None
    issued_at: Optional[str] = None


class ExamAdvisoryRequest(BaseModel):
    query: Optional[str] = None


class ExamAdvisoryResponse(BaseModel):
    student_id: int
    student_name: str
    usn: str
    department: str
    semester: int
    eligibility_summary: ExamEligibilitySummarySchema
    exam_schedules: List[ExamScheduleItemSchema]
    hall_ticket: HallTicketStatusSchema
    advisory_markdown: str
    citations: List[RAGSearchResultItem]


# --- Phase 16: Placement Agent Schemas ---

class PlacementDriveEligibilitySchema(BaseModel):
    drive_id: int
    company_name: str
    job_role: str
    ctc_lpa: float
    tier: str
    eligibility_min_cgpa: float
    eligible_departments: str
    drive_date: str
    application_deadline: str
    location: str
    cgpa_passed: bool
    dept_passed: bool
    upgrade_rule_passed: bool
    is_overall_eligible: bool
    ineligibility_reasons: List[str] = []
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    skill_match_percentage: float


class PlacementAdvisoryRequest(BaseModel):
    query: Optional[str] = None


class PlacementAdvisoryResponse(BaseModel):
    student_id: int
    student_name: str
    usn: str
    department: str
    semester: int
    cgpa: float
    placement_status: str
    existing_offer_ctc: Optional[float] = None
    total_active_drives: int
    eligible_drives_count: int
    super_dream_eligible_count: int
    dream_eligible_count: int
    core_eligible_count: int
    student_skills: List[str] = []
    focused_drive: Optional[PlacementDriveEligibilitySchema] = None
    drives: List[PlacementDriveEligibilitySchema] = []
    advisory_markdown: str
    citations: List[RAGSearchResultItem]


# --- Phase 20: Proactive AI Analytics & Insights Schemas ---

class UpcomingExamBriefingSchema(BaseModel):
    course_code: str
    course_name: str
    exam_date: str
    session: str
    room: str


class WeeklyBriefingResponse(BaseModel):
    student_id: int
    student_name: str
    usn: str
    cgpa: float
    overall_attendance: float
    fee_balance: float
    upcoming_exams_count: int
    upcoming_exams: List[UpcomingExamBriefingSchema] = []
    highlights: List[str] = []
    urgent_actions: List[str] = []
    briefing_markdown: str
    generated_at: str


class AtRiskCourseSchema(BaseModel):
    course_code: str
    course_name: str
    percentage: float
    risk_level: str
    status: str


class RiskRadarResponse(BaseModel):
    student_id: int
    overall_risk_level: str
    risk_score: int
    critical_shortage_count: int
    warning_count: int
    fee_balance_due: float
    active_backlogs: int
    at_risk_courses: List[AtRiskCourseSchema] = []
    radar_markdown: str
    evaluated_at: str


class StudySessionItemSchema(BaseModel):
    date: str
    course_code: str
    course_name: str
    target_focus: str
    recommended_study_hours: float
    difficulty_weight: str


class SmartStudyScheduleResponse(BaseModel):
    student_id: int
    total_study_days: int
    study_sessions: List[StudySessionItemSchema] = []
    schedule_markdown: str
    generated_at: str


# --- Phase 2: Advanced Predictive Analytics & Recommendations Schemas ---

class AttendanceRiskPredictionItem(BaseModel):
    course_code: str
    course_title: str
    current_attendance: float
    projected_attendance: float
    risk_level: str  # High, Medium, Low
    reason: str
    consecutive_classes_needed: int
    recommended_action: str


class AcademicRiskPredictionItem(BaseModel):
    course_code: str
    course_title: str
    current_average_marks: float
    risk_level: str  # High, Medium, Low
    reason: str
    suggested_intervention: str


class PersonalizedStudyRecommendationItem(BaseModel):
    course_code: str
    course_title: str
    priority: str  # High, Medium, Normal
    topics_to_revise: List[str]
    suggested_hours_per_week: float
    revision_strategy: str
    reason: str


class CourseRecommendationItem(BaseModel):
    course_code: str
    title: str
    domain: str
    recommendation_type: str  # Elective, Advanced Skill, Certification
    match_score: int  # 0-100%
    reason: str
    prerequisites: str


class ComprehensiveRecommendationsResponse(BaseModel):
    student_id: int
    student_name: str
    attendance_risks: List[AttendanceRiskPredictionItem] = []
    academic_risks: List[AcademicRiskPredictionItem] = []
    study_recommendations: List[PersonalizedStudyRecommendationItem] = []
    course_recommendations: List[CourseRecommendationItem] = []
    summary_markdown: str
    generated_at: str


# --- Phase 4: Enhanced Placement AI Assistant Schemas ---

class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    target_role: Optional[str] = "Software Development Engineer (SDE-1)"
    target_company_type: Optional[str] = "Product Company"


class ResumeAnalysisResponse(BaseModel):
    extracted_skills: List[str]
    missing_skills: List[str]
    education: List[str]
    projects: List[Dict[str, str]]
    experience: List[Dict[str, str]]
    certifications: List[str]
    strengths: List[str]
    ats_compatibility_tips: List[str]
    bullet_point_improvements: List[Dict[str, str]]
    role_relevance_score: int  # 0 - 100%
    analysis_markdown: str


class MockInterviewStartRequest(BaseModel):
    target_role: str = "Software Development Engineer"
    company_type: str = "Product & FAANG"
    domain_tech: str = "Python, Distributed Systems, Data Structures"
    difficulty: str = "Intermediate"


class MockInterviewStartResponse(BaseModel):
    interview_id: str
    target_role: str
    difficulty: str
    total_questions: int
    current_question_index: int
    first_question: str
    tips: str


class MockInterviewEvaluateRequest(BaseModel):
    interview_id: str
    question_index: int
    question_text: str
    student_answer: str


class MockInterviewEvaluateResponse(BaseModel):
    interview_id: str
    question_index: int
    score_out_of_10: float
    feedback: str
    strengths: List[str]
    weak_areas: List[str]
    model_answer: str
    next_question_index: Optional[int] = None
    next_question_text: Optional[str] = None
    is_completed: bool


class MockInterviewFinishRequest(BaseModel):
    interview_id: str


class MockInterviewFinishResponse(BaseModel):
    interview_id: str
    overall_score: float
    performance_tier: str  # Excellent, Strong, Needs Practice, At-Risk
    strengths: List[str]
    weaknesses: List[str]
    topics_to_improve: List[str]
    preparation_plan_markdown: str


class PlacementReadinessFactor(BaseModel):
    factor_name: str
    score: int
    weight: float
    status: str
    detail: str


class PlacementReadinessResponse(BaseModel):
    student_id: int
    student_name: str
    cgpa: float
    readiness_score: int  # 0-100%
    readiness_tier: str  # "Super Dream Ready", "Dream Ready", "Core Ready", "Needs Preparation"
    factors: List[PlacementReadinessFactor]
    key_strengths: List[str]
    improvement_actions: List[str]
    summary_markdown: str

