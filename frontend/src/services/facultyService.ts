import api from './api'

export interface AssignedCourseItem {
  id: number
  code: string
  name: string
  department: string
  credits: number
  semester: number
  total_students: number
  classes_conducted: number
  average_attendance: number
}

export interface StudentRosterItem {
  id: number
  user_id: number
  student_name: string
  student_id: string
  email: string
  department: string
  semester: number
  section: string
  total_classes: number
  attended_classes: number
  attendance_percentage: number
  cie1_score?: number
  cie2_score?: number
  cie3_score?: number
  assignment_score?: number
  final_cie?: number
  status: string
}

export interface FacultyOverviewKPIs {
  assigned_students: number
  assigned_subjects: number
  classes_sections: number
  average_attendance: number
  students_below_threshold: number
  average_class_performance: number
  upcoming_classes_count: number
  upcoming_exams_count: number
  pending_grievances_count: number
  important_notices_count: number
}

export interface FacultyTimetableItem {
  id: number
  day: string
  time: string
  course_code: string
  course_title: string
  room: string
  section: string
  semester: number
  status: string
}

export interface FacultyGrievanceItem {
  id: number
  ticket_number: string
  student_name: string
  student_id: string
  category: string
  subject: string
  description: string
  status: string
  created_at: string
  resolution_notes?: string
}

export interface StudentProfile360 {
  user_id: number
  student_name: string
  student_id: string
  email: string
  department: string
  semester: number
  section: string
  cgpa: number
  phone?: string
  overall_attendance: number
  attendance_records: Array<{
    course_id: number
    course_code: string
    course_title: string
    total_classes: number
    attended_classes: number
    percentage: number
    is_shortage: boolean
  }>
  internal_marks: Array<{
    id: number
    course_code: string
    course_title: string
    assessment_name: string
    max_marks: number
    obtained_marks: number
    percentage: number
  }>
  exam_schedules: Array<{
    course_code: string
    exam_name: string
    exam_date: string
    time_slot: string
    room_number: string
  }>
  hall_ticket_eligible: boolean
  hall_ticket_reason?: string
  placement_status?: string
  ai_academic_insights: string[]
}

export interface FacultyAnalyticsResponse {
  attendance_distribution: {
    above_85: number
    '75_to_85': number
    below_75: number
  }
  cie_distribution: {
    above_40: number
    '30_to_40': number
    below_30: number
  }
  performance_trends: Array<{
    month: string
    attendance: number
    cie_average: number
  }>
  top_performing_students: Array<{
    user_id: number
    student_name: string
    student_id: string
    department: string
    semester: number
    section: string
    attendance: number
    average_marks: number
    cgpa: number
  }>
  at_risk_students: Array<{
    user_id: number
    student_name: string
    student_id: string
    department: string
    semester: number
    section: string
    attendance: number
    average_marks: number
    risk_level: string
    reason: string
    recommended_action: string
  }>
  department_subject_averages: Array<{
    course_id: number
    course_code: string
    course_title: string
    semester: number
    average_attendance: number
  }>
}

export interface FacultyDashboardResponse {
  faculty_name: string
  faculty_email: string
  department: string
  designation: string
  total_assigned_courses: number
  total_active_students: number
  kpis: FacultyOverviewKPIs
  assigned_courses: AssignedCourseItem[]
  recent_classes: FacultyTimetableItem[]
  upcoming_exams: Array<{
    id: number
    course_code: string
    course_title: string
    exam_name: string
    exam_date: string
    time_slot: string
    room_number: string
  }>
  recent_grievances: FacultyGrievanceItem[]
  recent_notices: Array<{
    id: number
    title: string
    content: string
    category: string
    priority: string
    published_by: string
    is_pinned: boolean
    date: string
  }>
}

export const facultyService = {
  getDashboard: async (): Promise<FacultyDashboardResponse> => {
    const response = await api.get<FacultyDashboardResponse>('/api/v1/faculty/dashboard')
    return response.data
  },

  getCourseRoster: async (
    courseId: number,
    params?: {
      semester?: number
      section?: string
      attendance_filter?: string
      search?: string
    }
  ): Promise<StudentRosterItem[]> => {
    const response = await api.get<StudentRosterItem[]>(`/api/v1/faculty/courses/${courseId}/students`, {
      params,
    })
    return response.data
  },

  getAnalytics: async (courseId?: number, department?: string): Promise<FacultyAnalyticsResponse> => {
    const response = await api.get<FacultyAnalyticsResponse>('/api/v1/faculty/analytics', {
      params: { course_id: courseId, department },
    })
    return response.data
  },

  getStudentProfile: async (userId: number): Promise<StudentProfile360> => {
    const response = await api.get<StudentProfile360>(`/api/v1/faculty/students/${userId}/profile`)
    return response.data
  },

  getTimetable: async (): Promise<FacultyTimetableItem[]> => {
    const response = await api.get<FacultyTimetableItem[]>('/api/v1/faculty/timetable')
    return response.data
  },

  getGrievances: async (): Promise<FacultyGrievanceItem[]> => {
    const response = await api.get<FacultyGrievanceItem[]>('/api/v1/faculty/grievances')
    return response.data
  },

  respondToGrievance: async (
    grievanceId: number,
    resolutionNotes: string,
    status: string = 'resolved'
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/api/v1/faculty/grievances/${grievanceId}/respond`,
      { resolution_notes: resolutionNotes, status }
    )
    return response.data
  },

  batchMarkAttendance: async (
    courseId: number,
    date: string,
    records: Array<{ user_id: number; course_id: number; status: string }>
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/v1/faculty/attendance/batch-mark', {
      course_id: courseId,
      date,
      records,
    })
    return response.data
  },

  batchEnterMarks: async (
    courseId: number,
    records: Array<{ user_id: number; course_id: number; cie1?: number; cie2?: number; cie3?: number; assignment?: number }>
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/v1/faculty/marks/entry', {
      course_id: courseId,
      records,
    })
    return response.data
  },
}

export default facultyService
