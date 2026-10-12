export interface AdmissionsEnquiry {
  id: number
  full_name: string
  email: string
  phone: string
  program: string
  previous_qualification?: string
  percentage?: number
  state?: string
  city?: string
  query_notes?: string
  status: string
  created_at: string
}

export interface AdmissionsEnquiryPayload {
  full_name: string
  email: string
  phone: string
  program: string
  previous_qualification?: string
  percentage?: number
  state?: string
  city?: string
  query_notes?: string
}

export interface ProgramInfo {
  code: string
  name: string
  duration: string
  eligibility: string
  batch: string
  mode: string
  fee_per_sem: string
}

export interface PortalStats {
  university_name: string
  portal_name: string
  academic_batch: string
  admissions_status: string
  accreditations: string[]
  programs_offered: ProgramInfo[]
  helpline_phone: string
  helpline_email: string
  official_website: string
  maintenance_window: string
  total_enquiries_received: number
  active_students_count: number
}

export interface OTPResponse {
  success: boolean
  message: string
  identifier: string
  demo_otp: string
  expires_in_seconds: number
  user_found: boolean
}
