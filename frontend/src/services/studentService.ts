import api from './api'
import { StudentDashboardResponse } from '../types/student'

export const studentService = {
  async getDashboard(): Promise<StudentDashboardResponse> {
    const response = await api.get<StudentDashboardResponse>('/api/v1/student/dashboard')
    return response.data
  },
}

export default studentService
