export interface GrievanceItem {
  id: number
  ticket_number: string
  subject: string
  description: string
  category: 'academic' | 'examination' | 'hostel_mess' | 'infrastructure' | 'finance' | 'other' | string
  priority: 'low' | 'normal' | 'high' | 'urgent' | string
  status: 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'rejected' | string
  submitted_at: string
  resolved_at?: string
  admin_response?: string
}

export interface CreateGrievanceRequest {
  subject: string
  description: string
  category: string
  priority?: string
}

export interface CreateGrievanceResponse {
  success: boolean
  ticket_number: string
  message: string
  status: string
  created_at: string
}
