import api from './api'
import {
  CourseDetail,
  AttendanceDetail,
  CourseMarksSummary,
  AcademicTranscriptResponse,
  ElectiveCourseOption,
} from '../types/academic'

export const academicService = {
  async getCourses(): Promise<CourseDetail[]> {
    const response = await api.get<CourseDetail[]>('/api/v1/academics/courses')
    return response.data
  },

  async getAttendance(): Promise<AttendanceDetail[]> {
    const response = await api.get<AttendanceDetail[]>('/api/v1/academics/attendance')
    return response.data
  },

  async getMarks(): Promise<CourseMarksSummary[]> {
    const response = await api.get<CourseMarksSummary[]>('/api/v1/academics/marks')
    return response.data
  },

  async getTranscript(): Promise<AcademicTranscriptResponse> {
    const response = await api.get<AcademicTranscriptResponse>('/api/v1/academics/transcript')
    return response.data
  },

  async getElectives(): Promise<ElectiveCourseOption[]> {
    const response = await api.get<ElectiveCourseOption[]>('/api/v1/academics/electives')
    return response.data
  },

  async registerElective(courseId: number): Promise<{ message: string; enrolled: boolean }> {
    const response = await api.post<{ message: string; enrolled: boolean }>('/api/v1/academics/electives/register', {
      course_id: courseId,
    })
    return response.data
  },
}

export default academicService
