export interface CourseDetail {
  id: number
  code: string
  title: string
  department_name: string
  semester: number
  credits: number
  course_type: string
  syllabus_summary?: string | null
  faculty_name?: string | null
  is_enrolled: boolean
}

export interface AttendanceDetail {
  course_id: number
  course_code: string
  course_title: string
  faculty_name?: string | null
  total_classes: number
  attended_classes: number
  missed_classes: number
  percentage: number
  is_shortage: boolean
  status: 'safe' | 'adequate' | 'shortage'
  classes_needed_for_75: number
  max_classes_can_miss_for_75: number
}

export interface AssessmentMarkItem {
  id: number
  assessment_name: string
  max_marks: number
  obtained_marks: number
  percentage: number
  assessment_date: string
}

export interface CourseMarksSummary {
  course_id: number
  course_code: string
  course_title: string
  credits: number
  assessments: AssessmentMarkItem[]
  total_max_marks: number
  total_obtained_marks: number
  aggregate_percentage: number
  projected_grade: string
}

export interface SemesterTranscriptCourse {
  code: string
  title: string
  credits: number
  grade: string
  gp: number
}

export interface SemesterTranscriptItem {
  semester: number
  academic_year: string
  sgpa: number
  credits_registered: number
  credits_earned: number
  courses: SemesterTranscriptCourse[]
}

export interface AcademicTranscriptResponse {
  student_name: string
  student_id: string
  department: string
  cgpa: number
  total_credits_earned: number
  semesters: SemesterTranscriptItem[]
}

export interface ElectiveCourseOption {
  id: number
  code: string
  title: string
  credits: number
  faculty_name?: string | null
  syllabus_summary?: string | null
  available_seats: number
  is_selected: boolean
}
