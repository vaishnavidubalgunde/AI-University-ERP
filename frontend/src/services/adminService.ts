import api from './api'
import {
  AdminStatsResponse,
  StudentRegistryItem,
  CreateStudentRequest,
  CreateStudentResponse,
  AttendanceAnalyticsResponse,
  AcademicAnalyticsResponse,
  PlacementAnalyticsResponse,
  GrievanceAnalyticsResponse,
  FeeAnalyticsResponse,
  RealtimeTelemetryResponse,
  KnowledgeDocItem,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ReindexRAGResponse,
} from '../types/admin'

export interface RAGTestResult {
  query: string
  intent: string
  answer: string
  retrieved_chunks: Array<{
    chunk_id: string
    document_id: string
    document_name: string
    similarity_score: number
    text: string
    source_url: string
    page_number?: number
    category?: string
  }>
  citations: Array<{
    title: string
    page?: number
    url?: string
    confidence?: number
  }>
  latency_ms: number
  embedding_model: string
  llm_model: string
}

export const adminService = {
  getStats: async (): Promise<AdminStatsResponse> => {
    const response = await api.get<AdminStatsResponse>('/api/v1/admin/stats')
    return response.data
  },

  getTelemetry: async (): Promise<RealtimeTelemetryResponse> => {
    const response = await api.get<RealtimeTelemetryResponse>('/api/v1/admin/telemetry')
    return response.data
  },

  getAttendanceAnalytics: async (filters?: {
    department?: string
    semester?: number
    section?: string
  }): Promise<AttendanceAnalyticsResponse> => {
    const response = await api.get<AttendanceAnalyticsResponse>('/api/v1/admin/analytics/attendance', {
      params: filters,
    })
    return response.data
  },

  getAcademicAnalytics: async (filters?: {
    department?: string
    semester?: number
  }): Promise<AcademicAnalyticsResponse> => {
    const response = await api.get<AcademicAnalyticsResponse>('/api/v1/admin/analytics/academics', {
      params: filters,
    })
    return response.data
  },

  getPlacementAnalytics: async (): Promise<PlacementAnalyticsResponse> => {
    const response = await api.get<PlacementAnalyticsResponse>('/api/v1/admin/analytics/placements')
    return response.data
  },

  getGrievanceAnalytics: async (): Promise<GrievanceAnalyticsResponse> => {
    const response = await api.get<GrievanceAnalyticsResponse>('/api/v1/admin/analytics/grievances')
    return response.data
  },

  getFeeAnalytics: async (): Promise<FeeAnalyticsResponse> => {
    const response = await api.get<FeeAnalyticsResponse>('/api/v1/admin/analytics/fees')
    return response.data
  },

  getStudents: async (filters?: {
    search?: string
    department?: string
    semester?: number
    section?: string
  }): Promise<StudentRegistryItem[]> => {
    const response = await api.get<StudentRegistryItem[]>('/api/v1/admin/students', {
      params: filters,
    })
    return response.data
  },

  createStudent: async (payload: CreateStudentRequest): Promise<CreateStudentResponse> => {
    const response = await api.post<CreateStudentResponse>('/api/v1/admin/students', payload)
    return response.data
  },

  getDocuments: async (): Promise<KnowledgeDocItem[]> => {
    const response = await api.get<KnowledgeDocItem[]>('/api/v1/admin/documents')
    return response.data
  },

  uploadDocument: async (payload: DocumentUploadRequest): Promise<DocumentUploadResponse> => {
    const response = await api.post<DocumentUploadResponse>('/api/v1/admin/documents/upload', payload)
    return response.data
  },

  reindexVectorStore: async (): Promise<ReindexRAGResponse> => {
    const response = await api.post<ReindexRAGResponse>('/api/v1/admin/rag/reindex')
    return response.data
  },

  testRagKnowledge: async (query: string): Promise<RAGTestResult> => {
    const response = await api.post<RAGTestResult>('/api/v1/admin/rag/test-query', { query })
    return response.data
  },
}

export default adminService
