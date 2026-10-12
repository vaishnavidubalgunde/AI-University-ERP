import api from './api'
import {
  FeeSummaryResponse,
  FeePaymentRequest,
  FeePaymentResponse,
  OfficialDocumentItem,
  DocumentRequestPayload,
  DocumentRequestResponse,
} from '../types/finance'

export const financeService = {
  getFeeSummary: async (): Promise<FeeSummaryResponse> => {
    const response = await api.get<FeeSummaryResponse>('/api/v1/finance/fees')
    return response.data
  },

  payFee: async (payload: FeePaymentRequest): Promise<FeePaymentResponse> => {
    const response = await api.post<FeePaymentResponse>('/api/v1/finance/pay', payload)
    return response.data
  },

  getAvailableDocuments: async (): Promise<OfficialDocumentItem[]> => {
    const response = await api.get<OfficialDocumentItem[]>('/api/v1/finance/documents')
    return response.data
  },

  requestDocument: async (payload: DocumentRequestPayload): Promise<DocumentRequestResponse> => {
    const response = await api.post<DocumentRequestResponse>('/api/v1/finance/documents/request', payload)
    return response.data
  },
}

export default financeService
