import apiClient from './api'
import { AdmissionsEnquiry, AdmissionsEnquiryPayload, PortalStats, OTPResponse } from '../types/admissions'
import { AuthResponse } from '../types/auth'

export const admissionsService = {
  // Submit admission application / enquiry
  applyAdmission: async (data: AdmissionsEnquiryPayload): Promise<AdmissionsEnquiry> => {
    const response = await apiClient.post<AdmissionsEnquiry>('/api/v1/admissions/apply', data)
    return response.data
  },

  // Get live portal info and programs
  getPortalInfo: async (): Promise<PortalStats> => {
    const response = await apiClient.get<PortalStats>('/api/v1/admissions/portal-info')
    return response.data
  },

  // Request OTP for student/staff
  requestOtp: async (identifier: string, role = 'student'): Promise<OTPResponse> => {
    const response = await apiClient.post<OTPResponse>('/api/v1/auth/request-otp', { identifier, role })
    return response.data
  },

  // Verify OTP and sign in
  verifyOtp: async (identifier: string, otp_code: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/verify-otp', { identifier, otp_code })
    return response.data
  },

  // Forgot password
  forgotPassword: async (identifier: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/auth/forgot-password', { identifier })
    return response.data
  },
}

export default admissionsService
