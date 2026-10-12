import api from './api'
import {
  GrievanceItem,
  CreateGrievanceRequest,
  CreateGrievanceResponse,
} from '../types/grievance'

export const grievanceService = {
  getGrievances: async (): Promise<GrievanceItem[]> => {
    const response = await api.get<GrievanceItem[]>('/api/v1/grievances')
    return response.data
  },

  submitGrievance: async (payload: CreateGrievanceRequest): Promise<CreateGrievanceResponse> => {
    const response = await api.post<CreateGrievanceResponse>('/api/v1/grievances', payload)
    return response.data
  },
}

export default grievanceService
