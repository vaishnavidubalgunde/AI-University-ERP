export interface RAGSearchResultItem {
  chunk_id: string
  document_title: string
  filename: string
  section_title: string
  text: string
  similarity_score: number
  citation: string
  page_number?: number
  has_table?: boolean
}

export interface RAGSearchResponse {
  query: string
  results_count: number
  results: RAGSearchResultItem[]
}

export interface RAGIngestResponse {
  success: boolean
  total_documents: number
  total_chunks: number
  message: string
}

export interface ChatMessageItem {
  id: number
  sender: 'user' | 'ai_agent' | string
  agent_name?: string
  intent?: string
  content: string
  sources?: RAGSearchResultItem[]
  document_id?: number | null
  page_references?: number[] | null
  feedback?: 'like' | 'dislike' | null
  language?: string
  created_at: string
}

export interface ChatSessionItem {
  session_uuid: string
  title: string
  active_document_id?: number | null
  active_document_title?: string | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface SendMessageRequest {
  session_uuid?: string
  message: string
  active_document_id?: number | null
  agent_type?: 'academic' | 'exam' | 'placement' | 'finance' | 'general' | string
  language?: 'en' | 'kn' | 'hi' | string
}

export interface SendMessageResponse {
  session_uuid: string
  user_message: ChatMessageItem
  ai_message: ChatMessageItem
  active_document_id?: number | null
}

export interface CreateSessionResponse {
  session_uuid: string
  title: string
  active_document_id?: number | null
  created_at: string
}

// --- Document Intelligence Types ---

export interface FactItem {
  text: string
  page_number: number
  section?: string
  category?: string
}

export interface TableInfo {
  title?: string
  page_number: number
  headers: string[]
  rows: string[][]
  raw_markdown?: string
}

export interface DocumentAnalysisData {
  title: string
  total_pages: number
  document_type: string
  academic_year: string
  executive_summary: string
  document_structure: string[]
  key_points: FactItem[]
  important_rules: FactItem[]
  important_dates: FactItem[]
  eligibility_requirements: FactItem[]
  important_definitions: FactItem[]
  notable_changes: FactItem[]
  document_conclusion: string
  extracted_tables: TableInfo[]
  summary_markdown: string
}

export interface DocumentItem {
  id: number
  doc_uuid: string
  title: string
  original_filename: string
  file_size_formatted: string
  mime_type: string
  category: string
  total_pages: number
  pages_processed: number
  status: 'UPLOADING' | 'PROCESSING' | 'EXTRACTING' | 'CHUNKING' | 'EMBEDDING' | 'READY' | 'FAILED' | string
  error_message?: string | null
  is_scanned: boolean
  ocr_performed: boolean
  ocr_confidence: number
  version?: string
  academic_year?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface DocumentStatusResponse {
  doc_id: number
  doc_uuid: string
  status: string
  progress_percentage: number
  current_step: string
  total_pages: number
  pages_completed: number
  error_message?: string | null
}

export interface DocumentOverviewData {
  title: string
  total_pages: number
  sections: string[]
  rules: string[]
  dates: string[]
  key_points: string[]
  definitions: string[]
  summary_markdown: string
}

export interface DocumentUploadResponse {
  success: boolean
  doc_id: number
  doc_uuid: string
  title: string
  total_pages: number
  status: string
  message: string
  overview?: DocumentOverviewData | null
  analysis?: DocumentAnalysisData | null
}

export interface DocumentDetailResponse {
  id: number
  doc_uuid: string
  title: string
  original_filename: string
  file_size_formatted: string
  category: string
  total_pages: number
  pages_processed: number
  status: string
  is_scanned: boolean
  ocr_performed: boolean
  ocr_confidence: number
  version?: string
  academic_year?: string
  summary?: string | null
  overview?: DocumentOverviewData | null
  analysis?: DocumentAnalysisData | null
  created_at: string
}

export interface DocumentSummaryResponse {
  doc_id: number
  doc_title: string
  summary_mode: string
  summary_markdown: string
  questions?: string[]
  mcqs?: {
    question: string
    options: string[]
    answer: string
    explanation: string
  }[]
}

export interface DocumentPageItem {
  page_number: number
  text: string
  word_count: number
  headings: string[]
  has_tables: boolean
  tables: Record<string, unknown>[]
}

// --- Document Comparison Types ---

export interface ComparisonTableItem {
  category: string
  old_value: string
  new_value: string
  change_type: 'MODIFIED' | 'NEW' | 'REMOVED' | 'UNCHANGED' | string
  old_page?: number | null
  new_page?: number | null
  description: string
}

export interface DocumentComparisonRequest {
  doc_a_id: number
  doc_b_id: number
}

export interface DocumentComparisonResponse {
  comparison_uuid: string
  doc_a_id: number
  doc_a_title: string
  doc_a_version: string
  doc_b_id: number
  doc_b_title: string
  doc_b_version: string
  is_identical: boolean
  summary_of_major_changes: string[]
  changed_rules: ComparisonTableItem[]
  changed_dates: ComparisonTableItem[]
  changed_requirements: ComparisonTableItem[]
  new_items: ComparisonTableItem[]
  removed_items: ComparisonTableItem[]
  modified_items: ComparisonTableItem[]
  unchanged_items: ComparisonTableItem[]
  comparison_matrix: ComparisonTableItem[]
  comparison_markdown: string
  created_at: string
}

export interface ExtractedEntities {
  course_codes: string[]
  companies: string[]
  percentages: string[]
  semesters: number[]
  cgpa?: number | null
  dates: string[]
}

export interface SecondaryIntent {
  intent: string
  score: number
  agent: string
}

export interface IntentClassifyRequest {
  query: string
}

export interface IntentClassifyResponse {
  query: string
  primary_intent: string
  confidence: number
  secondary_intents: SecondaryIntent[]
  is_compound_query: boolean
  recommended_agent: string
  extracted_entities: ExtractedEntities
}

// --- Phase 14: Academic Agent Interfaces ---

export interface CourseAttendanceAnalysis {
  course_id: number
  course_code: string
  course_name: string
  credits: number
  faculty_name: string
  attended_classes: number
  total_classes: number
  percentage: number
  has_shortage: boolean
  consecutive_classes_needed_for_75: number
  safe_missable_classes: number
  condonation_status: string
}

export interface AttendanceSummary {
  average_attendance: number
  total_courses: number
  shortage_courses_count: number
  condonation_eligible_count: number
  critical_shortage_count: number
  is_overall_eligible_for_exams: boolean
  courses: CourseAttendanceAnalysis[]
}

export interface CourseCIEMarksAnalysis {
  course_id: number
  course_code: string
  course_name: string
  test1: number
  test2: number
  quiz: number
  assignment: number
  total_cie: number
  max_cie: number
  is_cie_eligible_for_see: boolean
  see_min_marks_needed_out_of_50: number
}

export interface CIEMarksSummary {
  average_cie_marks: number
  total_evaluated_courses: number
  cie_cleared_count: number
  cie_failed_count: number
  courses: CourseCIEMarksAnalysis[]
}

export interface AcademicAdvisoryRequest {
  query?: string
}

export interface AcademicAdvisoryResponse {
  student_id: number
  student_name: string
  usn: string
  department: string
  semester: number
  cgpa: number
  attendance_analysis: AttendanceSummary
  cie_marks_analysis: CIEMarksSummary
  focused_course?: CourseAttendanceAnalysis | null
  advisory_markdown: string
  citations: RAGSearchResultItem[]
}

// --- Phase 15: Examination Agent Interfaces ---

export interface CourseExamEligibility {
  course_id: number
  course_code: string
  course_name: string
  credits: number
  attendance_percentage: number
  attendance_eligible: boolean
  is_condonation_applicable: boolean
  cie_marks: number
  cie_eligible: boolean
  is_course_eligible: boolean
  remarks: string
}

export interface ExamEligibilitySummary {
  overall_status: string
  is_overall_eligible: boolean
  fee_balance_due: number
  fee_clearance_passed: boolean
  total_courses: number
  eligible_courses_count: number
  condonation_pending_count: number
  ineligible_courses_count: number
  courses: CourseExamEligibility[]
}

export interface ExamScheduleItem {
  schedule_id: number
  course_id: number
  course_code: string
  course_name: string
  exam_name: string
  exam_date: string
  time_slot: string
  room_number: string
  max_marks: number
  days_remaining: number
  status: string
}

export interface HallTicketStatus {
  has_hall_ticket: boolean
  hall_ticket_id?: number | null
  usn?: string | null
  student_name?: string | null
  semester?: number | null
  academic_year?: string | null
  is_eligible?: boolean | null
  status: string
  ineligibility_reason?: string | null
  qr_token?: string | null
  cryptographic_signature?: string | null
  issued_at?: string | null
}

export interface ExamAdvisoryRequest {
  query?: string
}

export interface ExamAdvisoryResponse {
  student_id: number
  student_name: string
  usn: string
  department: string
  semester: number
  eligibility_summary: ExamEligibilitySummary
  exam_schedules: ExamScheduleItem[]
  hall_ticket: HallTicketStatus
  advisory_markdown: string
  citations: RAGSearchResultItem[]
}

// --- Phase 16: Placement Agent Interfaces ---

export interface PlacementDriveEligibility {
  drive_id: number
  company_name: string
  job_role: string
  ctc_lpa: number
  tier: string
  eligibility_min_cgpa: number
  eligible_departments: string
  drive_date: string
  application_deadline: string
  location: string
  cgpa_passed: boolean
  dept_passed: boolean
  upgrade_rule_passed: boolean
  is_overall_eligible: boolean
  ineligibility_reasons: string[]
  matched_skills: string[]
  missing_skills: string[]
  skill_match_percentage: number
}

export interface PlacementAdvisoryRequest {
  query?: string
}

export interface PlacementAdvisoryResponse {
  student_id: number
  student_name: string
  usn: string
  department: string
  semester: number
  cgpa: number
  placement_status: string
  existing_offer_ctc?: number | null
  total_active_drives: number
  eligible_drives_count: number
  super_dream_eligible_count: number
  dream_eligible_count: number
  core_eligible_count: number
  student_skills: string[]
  focused_drive?: PlacementDriveEligibility | null
  drives: PlacementDriveEligibility[]
  advisory_markdown: string
  citations: RAGSearchResultItem[]
}

// --- Phase 20: Proactive AI Analytics & Insights Interfaces ---

export interface UpcomingExamBriefing {
  course_code: string
  course_name: string
  exam_date: string
  session: string
  room: string
}

export interface WeeklyBriefingResponse {
  student_id: number
  student_name: string
  usn: string
  cgpa: number
  overall_attendance: number
  fee_balance: number
  upcoming_exams_count: number
  upcoming_exams: UpcomingExamBriefing[]
  highlights: string[]
  urgent_actions: string[]
  briefing_markdown: string
  generated_at: string
}

export interface AtRiskCourse {
  course_code: string
  course_name: string
  percentage: number
  risk_level: string
  status: string
}

export interface RiskRadarResponse {
  student_id: number
  overall_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string
  risk_score: number
  critical_shortage_count: number
  warning_count: number
  fee_balance_due: number
  active_backlogs: number
  at_risk_courses: AtRiskCourse[]
  radar_markdown: string
  evaluated_at: string
}

export interface StudySessionItem {
  date: string
  course_code: string
  course_name: string
  target_focus: string
  recommended_study_hours: number
  difficulty_weight: string
}

export interface SmartStudyScheduleResponse {
  student_id: number
  total_study_days: number
  study_sessions: StudySessionItem[]
  schedule_markdown: string
  generated_at: string
}

// --- Phase 2: Predictive Intelligence & Academic Recommendations ---

export interface AttendanceRiskPredictionItem {
  course_code: string
  course_title: string
  current_attendance: number
  projected_attendance: number
  risk_level: 'High' | 'Medium' | 'Low' | string
  reason: string
  consecutive_classes_needed: number
  recommended_action: string
}

export interface AcademicRiskPredictionItem {
  course_code: string
  course_title: string
  current_average_marks: number
  risk_level: 'High' | 'Medium' | 'Low' | string
  reason: string
  suggested_intervention: string
}

export interface PersonalizedStudyRecommendationItem {
  course_code: string
  course_title: string
  priority: 'High' | 'Medium' | 'Normal' | string
  topics_to_revise: string[]
  suggested_hours_per_week: number
  revision_strategy: string
  reason: string
}

export interface CourseRecommendationItem {
  course_code: string
  title: string
  domain: string
  recommendation_type: string
  match_score: number
  reason: string
  prerequisites: string
}

export interface ComprehensiveRecommendationsResponse {
  student_id: number
  student_name: string
  attendance_risks: AttendanceRiskPredictionItem[]
  academic_risks: AcademicRiskPredictionItem[]
  study_recommendations: PersonalizedStudyRecommendationItem[]
  course_recommendations: CourseRecommendationItem[]
  summary_markdown: string
  generated_at: string
}

// --- Phase 4: Enhanced Placement AI Assistant Types ---

export interface ResumeAnalysisRequest {
  resume_text: string
  target_role?: string
  target_company_type?: string
}

export interface ResumeAnalysisResponse {
  extracted_skills: string[]
  missing_skills: string[]
  education: string[]
  projects: Array<{ title: string; tech: string; impact: string }>
  experience: Array<{ role: string; company: string; duration: string; summary: string }>
  certifications: string[]
  strengths: string[]
  ats_compatibility_tips: string[]
  bullet_point_improvements: Array<{ original: string; improved: string }>
  role_relevance_score: number
  analysis_markdown: string
}

export interface MockInterviewStartRequest {
  target_role: string
  company_type: string
  domain_tech: string
  difficulty: string
}

export interface MockInterviewStartResponse {
  interview_id: string
  target_role: string
  difficulty: string
  total_questions: number
  current_question_index: number
  first_question: string
  tips: string
}

export interface MockInterviewEvaluateRequest {
  interview_id: string
  question_index: number
  question_text: string
  student_answer: string
}

export interface MockInterviewEvaluateResponse {
  interview_id: string
  question_index: number
  score_out_of_10: number
  feedback: string
  strengths: string[]
  weak_areas: string[]
  model_answer: string
  next_question_index?: number | null
  next_question_text?: string | null
  is_completed: boolean
}

export interface MockInterviewFinishResponse {
  interview_id: string
  overall_score: number
  performance_tier: string
  strengths: string[]
  weaknesses: string[]
  topics_to_improve: string[]
  preparation_plan_markdown: string
}

export interface PlacementReadinessFactor {
  factor_name: string
  score: number
  weight: number
  status: string
  detail: string
}

export interface PlacementReadinessResponse {
  student_id: number
  student_name: string
  cgpa: number
  readiness_score: number
  readiness_tier: string
  factors: PlacementReadinessFactor[]
  key_strengths: string[]
  improvement_actions: string[]
  summary_markdown: string
}

