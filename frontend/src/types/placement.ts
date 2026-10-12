export interface PlacementDriveItem {
  id: number
  company_name: string
  job_role: string
  ctc_package: string
  location: string
  min_cgpa: number
  max_backlogs: number
  eligible_departments: string
  deadline: string
  selection_rounds?: string
  is_eligible: boolean
  eligibility_reason?: string
  has_applied: boolean
  application_status?: string
}

export interface PlacementApplicationItem {
  id: number
  drive_id: number
  company_name: string
  job_role: string
  ctc_package: string
  applied_date: string
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | string
  interview_date?: string
  round_name?: string
  remarks?: string
}

export interface ApplyDriveRequest {
  drive_id: number
  resume_url?: string
}

export interface ApplyDriveResponse {
  success: boolean
  application_id: number
  message: string
  status: string
}
