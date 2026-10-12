import api from './api'
import {
  WeeklyTimetableResponse,
  ExamScheduleDetail,
  ExamEligibilityResponse,
  HallTicketResponse,
} from '../types/exam'

export const examService = {
  getWeeklyTimetable: async (): Promise<WeeklyTimetableResponse> => {
    const response = await api.get<WeeklyTimetableResponse>('/api/v1/exams/timetable/weekly')
    return response.data
  },

  getExamSchedules: async (): Promise<ExamScheduleDetail[]> => {
    const response = await api.get<ExamScheduleDetail[]>('/api/v1/exams/schedules')
    return response.data
  },

  getExamEligibility: async (): Promise<ExamEligibilityResponse> => {
    const response = await api.get<ExamEligibilityResponse>('/api/v1/exams/eligibility')
    return response.data
  },

  getHallTicket: async (): Promise<HallTicketResponse> => {
    const response = await api.get<HallTicketResponse>('/api/v1/exams/hall-ticket')
    return response.data
  },
}

export default examService
