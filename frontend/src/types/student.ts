export interface CourseAttendanceSummary {
  course_id: number
  course_code: string
  course_title: string
  faculty_name?: string | null
  attended_classes: number
  total_classes: number
  percentage: number
  is_shortage: boolean
  classes_needed_for_75: number
}

export interface ScheduleItem {
  time_slot: string
  course_code: string
  course_title: string
  room_number: string
  faculty_name?: string | null
  status: 'completed' | 'ongoing' | 'upcoming'
}

export interface UpcomingExamItem {
  course_code: string
  course_title: string
  exam_name: string
  exam_date: string
  time_slot: string
  room_number: string
  days_left: number
}

export interface DashboardNoticeItem {
  id: number
  title: string
  content: string
  category: string
  priority: string
  published_by: string
  published_at: string
  is_pinned: boolean
}

export interface AIInsightItem {
  category: string
  title: string
  message: string
  action_text?: string | null
  action_intent?: string | null
}

export interface StudentDashboardResponse {
  student_name: string
  student_id: string
  department: string
  semester: number
  cgpa: number
  gpa_trend: string
  total_credits_earned: number
  total_credits_required: number
  overall_attendance_pct: number
  attendance_shortages_count: number
  fee_balance_due: number
  hall_ticket_eligible: boolean
  courses_attendance: CourseAttendanceSummary[]
  today_schedule: ScheduleItem[]
  upcoming_exams: UpcomingExamItem[]
  recent_notices: DashboardNoticeItem[]
  ai_insights: AIInsightItem[]
}
