export interface FeeRecordItem {
  id: number
  semester: number
  academic_year: string
  category: string
  total_amount: number
  paid_amount: number
  balance_due: number
  due_date: string
  status: 'paid' | 'partial' | 'pending' | 'overdue' | string
  transaction_id?: string
  paid_at?: string
  receipt_number?: string
}

export interface FeeSummaryResponse {
  student_name: string
  student_id: string
  department: string
  semester: number
  total_fee: number
  total_paid: number
  total_due: number
  overall_status: 'CLEARED' | 'PENDING_DUES' | 'OVERDUE' | string
  records: FeeRecordItem[]
}

export interface FeePaymentRequest {
  fee_record_id: number
  amount: number
  payment_method: string
}

export interface FeePaymentResponse {
  success: boolean
  transaction_id: string
  receipt_number: string
  amount_paid: number
  remaining_balance: number
  message: string
  timestamp: string
}

export interface OfficialDocumentItem {
  id: string
  title: string
  category: string
  description: string
  processing_time: string
  fee: number
  status: 'READY_TO_DOWNLOAD' | 'PROCESSING' | 'PENDING_FEE_CLEARANCE' | string
  verification_hash?: string
  issued_date?: string
}

export interface DocumentRequestPayload {
  document_id: string
  purpose: string
}

export interface DocumentRequestResponse {
  request_id: string
  document_title: string
  status: string
  message: string
  download_url?: string
  generated_at: string
}
