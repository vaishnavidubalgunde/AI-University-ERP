export interface DepartmentStat {
  name: string
  code: string
  courses_count: number
  head_of_department: string
}

export interface AdminOverviewKPIs {
  total_students: number
  total_faculty: number
  total_courses: number
  total_departments: number
  campus_average_attendance: number
  total_placement_offers: number
  average_ctc_lpa: number
  highest_ctc_lpa: number
  placement_rate_pct: number
  open_grievances: number
  fee_collection_rate: number
  total_fees_collected: number
  total_fees_pending: number
  active_exams_count: number
  recent_notices_count: number
  last_synced_at: string
}

export interface AdminStatsResponse {
  total_students: number
  total_faculty: number
  total_courses: number
  total_departments: number
  campus_average_attendance: number
  total_placement_offers: number
  open_grievances: number
  fee_collection_rate: number
  department_distribution: DepartmentStat[]
  kpis?: AdminOverviewKPIs
}

export interface StudentRegistryItem {
  id: number
  student_id: string
  full_name: string
  email: string
  department: string
  semester: number
  section?: string
  cgpa: number
  attendance_pct?: number
  is_active: boolean
  created_at: string
}

export interface CreateStudentRequest {
  full_name: string
  email: string
  password?: string
  student_id: string
  department: string
  semester?: number
  section?: string
  cgpa?: number
}

export interface CreateStudentResponse {
  success: boolean
  student_id: string
  user_id: number
  message: string
}

export interface AttendanceAnalyticsResponse {
  campus_average: number
  department_attendance: Array<{
    department_code: string
    department_name: string
    average_attendance: number
    total_students: number
  }>
  semester_attendance: Array<{
    semester: number
    attendance: number
  }>
  low_attendance_students: Array<{
    user_id: number
    student_name: string
    student_id: string
    department: string
    semester: number
    section: string
    attendance_percentage: number
    shortage_courses_count: number
    risk_status: string
  }>
  monthly_trends: Array<{
    month: string
    attendance: number
  }>
}

export interface AcademicAnalyticsResponse {
  overall_average_marks: number
  overall_pass_rate: number
  department_performance: Array<{
    department_code: string
    department_name: string
    average_cgpa: number
    pass_percentage: number
  }>
  subject_performance: Array<{
    course_code: string
    course_title: string
    semester: number
    average_marks: number
    pass_rate: number
  }>
  grade_distribution: Record<string, number>
  at_risk_students: Array<{
    student_name: string
    student_id: string
    department: string
    semester: number
    cgpa: number
    reason: string
    action: string
  }>
}

export interface PlacementAnalyticsResponse {
  eligible_students_count: number
  total_offers: number
  placement_rate: number
  average_ctc: number
  highest_ctc: number
  application_funnel: Record<string, number>
  department_placements: Array<{
    department: string
    eligible: number
    placed: number
    rate: number
    avg_ctc: number
  }>
  readiness_distribution: Record<string, number>
}

export interface GrievanceAnalyticsResponse {
  total_grievances: number
  open_count: number
  in_progress_count: number
  resolved_count: number
  rejected_count: number
  category_breakdown: Record<string, number>
  avg_resolution_days: number
  recent_grievances: Array<{
    ticket: string
    subject: string
    category: string
    status: string
    assigned_to: string
    created_at: string
  }>
}

export interface FeeAnalyticsResponse {
  total_billed: number
  total_collected: number
  total_outstanding: number
  collection_rate: number
  category_breakdown: Array<{
    category: string
    billed: number
    collected: number
    rate: number
  }>
  department_collections: Array<{
    department: string
    rate: number
    collected: string
  }>
}

export interface RealtimeTelemetryResponse {
  timestamp: string
  active_students_online: number
  classes_in_session: number
  campus_attendance_today: number
  unresolved_grievances: number
  fee_transactions_today: number
  system_load_pct: number
}

export interface KnowledgeDocItem {
  id: string
  title: string
  category: string
  filename: string
  file_size: string
  uploaded_at: string
  chunk_count: number
  status: string
}

export interface DocumentUploadRequest {
  title: string
  category: string
  content: string
  filename: string
}

export interface DocumentUploadResponse {
  success: boolean
  doc_id: string
  title: string
  message: string
  chunks_created: number
}

export interface ReindexRAGResponse {
  success: boolean
  message: string
  total_documents: number
  total_vectors_indexed: number
  timestamp: string
}
