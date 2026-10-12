export interface TimetableSlot {
  id: string
  time_slot: string
  course_code: string
  course_title: string
  room_number: string
  faculty_name?: string
  slot_type: 'lecture' | 'lab' | 'tutorial' | 'seminar'
}

export interface DayTimetable {
  day: string
  slots: TimetableSlot[]
}

export interface WeeklyTimetableResponse {
  academic_year: string
  semester: number
  department: string
  days: DayTimetable[]
}

export interface ExamScheduleDetail {
  id: number
  course_code: string
  course_title: string
  exam_name: string
  exam_date: string
  time_slot: string
  reporting_time: string
  room_number: string
  seat_number: string
  max_marks: number
  days_left: number
  is_completed: boolean
}

export interface CourseEligibilityItem {
  course_code: string
  course_title: string
  attendance_pct: number
  is_eligible: boolean
  reason?: string
}

export interface ExamEligibilityResponse {
  student_name: string
  student_id: string
  semester: number
  overall_eligible: boolean
  ineligibility_reasons: string[]
  attendance_clearance: boolean
  fee_clearance: boolean
  disciplinary_clearance: boolean
  fee_balance_due: number
  course_eligibilities: CourseEligibilityItem[]
}

export interface HallTicketCourseItem {
  course_code: string
  course_title: string
  exam_date: string
  time_slot: string
  room_number: string
  seat_number: string
}

export interface HallTicketResponse {
  hall_ticket_number: string
  qr_token: string
  student_name: string
  student_id: string
  department: string
  semester: number
  academic_year: string
  is_eligible: boolean
  ineligibility_reason?: string
  issued_date: string
  courses: HallTicketCourseItem[]
  exam_center: string
  instructions: string[]
}
