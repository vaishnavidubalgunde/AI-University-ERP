import api from './api'
import {
  RAGSearchResponse,
  RAGIngestResponse,
  ChatSessionItem,
  ChatMessageItem,
  SendMessageRequest,
  SendMessageResponse,
  CreateSessionResponse,
  DocumentItem,
  DocumentStatusResponse,
  DocumentUploadResponse,
  DocumentDetailResponse,
  DocumentSummaryResponse,
  DocumentAnalysisData,
  DocumentPageItem,
  DocumentComparisonRequest,
  DocumentComparisonResponse,
  IntentClassifyResponse,
  AcademicAdvisoryResponse,
  ExamAdvisoryResponse,
  PlacementAdvisoryResponse,
  WeeklyBriefingResponse,
  RiskRadarResponse,
  SmartStudyScheduleResponse,
  ComprehensiveRecommendationsResponse,
  AttendanceRiskPredictionItem,
  AcademicRiskPredictionItem,
  PersonalizedStudyRecommendationItem,
  CourseRecommendationItem,
  ResumeAnalysisRequest,
  ResumeAnalysisResponse,
  MockInterviewStartRequest,
  MockInterviewStartResponse,
  MockInterviewEvaluateRequest,
  MockInterviewEvaluateResponse,
  MockInterviewFinishResponse,
  PlacementReadinessResponse,
} from '../types/ai'

export const aiService = {
  // Document Management APIs
  uploadDocument: async (
    file: File,
    title?: string,
    category?: string,
    version?: string,
    isPublic?: boolean
  ): Promise<DocumentUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (category) formData.append('category', category)
    if (version) formData.append('version', version)
    if (isPublic !== undefined) formData.append('is_public', isPublic.toString())

    const response = await api.post<DocumentUploadResponse>('/api/v1/ai/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getDocuments: async (): Promise<DocumentItem[]> => {
    const response = await api.get<DocumentItem[]>('/api/v1/ai/documents')
    return response.data
  },

  getDocumentDetails: async (docId: number): Promise<DocumentDetailResponse> => {
    const response = await api.get<DocumentDetailResponse>(`/api/v1/ai/documents/${docId}`)
    return response.data
  },

  getDocumentAnalysis: async (docId: number): Promise<DocumentAnalysisData> => {
    const response = await api.get<DocumentAnalysisData>(`/api/v1/ai/documents/${docId}/analysis`)
    return response.data
  },

  getDocumentPages: async (docId: number): Promise<DocumentPageItem[]> => {
    const response = await api.get<DocumentPageItem[]>(`/api/v1/ai/documents/${docId}/pages`)
    return response.data
  },

  compareDocuments: async (payload: DocumentComparisonRequest): Promise<DocumentComparisonResponse> => {
    const response = await api.post<DocumentComparisonResponse>('/api/v1/ai/documents/compare', payload)
    return response.data
  },

  deleteDocument: async (docId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/v1/ai/documents/${docId}`)
    return response.data
  },

  getDocumentStatus: async (docId: number): Promise<DocumentStatusResponse> => {
    const response = await api.get<DocumentStatusResponse>(`/api/v1/ai/documents/${docId}/status`)
    return response.data
  },

  reprocessDocument: async (docId: number): Promise<DocumentUploadResponse> => {
    const response = await api.post<DocumentUploadResponse>(`/api/v1/ai/documents/${docId}/reprocess`)
    return response.data
  },

  getDocumentSummary: async (docId: number, summaryMode: string = 'detailed'): Promise<DocumentSummaryResponse> => {
    const response = await api.post<DocumentSummaryResponse>(`/api/v1/ai/documents/${docId}/summary`, {
      summary_mode: summaryMode,
    })
    return response.data
  },

  // Feedback on AI Message
  submitFeedback: async (msgId: number, feedback: 'like' | 'dislike' | 'none'): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/ai/messages/${msgId}/feedback`, {
      feedback,
    })
    return response.data
  },

  // Chat & Session APIs
  getSessions: async (): Promise<ChatSessionItem[]> => {
    const response = await api.get<ChatSessionItem[]>('/api/v1/ai/sessions')
    return response.data
  },

  createSession: async (title?: string, activeDocId?: number): Promise<CreateSessionResponse> => {
    const params = new URLSearchParams()
    if (title) params.append('title', title)
    if (activeDocId) params.append('active_document_id', activeDocId.toString())
    const response = await api.post<CreateSessionResponse>(`/api/v1/ai/sessions?${params.toString()}`)
    return response.data
  },

  deleteSession: async (sessionUuid: string): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(`/api/v1/ai/sessions/${sessionUuid}`)
    return response.data
  },

  getSessionMessages: async (sessionUuid: string): Promise<ChatMessageItem[]> => {
    const response = await api.get<ChatMessageItem[]>(`/api/v1/ai/sessions/${sessionUuid}/messages`)
    return response.data
  },

  sendMessage: async (payload: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/api/v1/ai/chat', payload)
    return response.data
  },

  // RAG & Ingestion
  searchKnowledgeBase: async (query: string, topK: number = 3): Promise<RAGSearchResponse> => {
    const params = new URLSearchParams()
    params.append('query', query)
    params.append('top_k', topK.toString())
    const response = await api.get<RAGSearchResponse>(`/api/v1/ai/rag/search?${params.toString()}`)
    return response.data
  },

  reingestKnowledgeBase: async (): Promise<RAGIngestResponse> => {
    const response = await api.post<RAGIngestResponse>('/api/v1/ai/rag/ingest')
    return response.data
  },

  classifyIntent: async (query: string): Promise<IntentClassifyResponse> => {
    const response = await api.post<IntentClassifyResponse>('/api/v1/ai/intent/classify', { query })
    return response.data
  },

  // Domain AI Agents
  getAcademicAdvisory: async (query?: string): Promise<AcademicAdvisoryResponse> => {
    const response = await api.post<AcademicAdvisoryResponse>('/api/v1/ai/agents/academic', { query })
    return response.data
  },

  getExaminationAdvisory: async (query?: string): Promise<ExamAdvisoryResponse> => {
    const response = await api.post<ExamAdvisoryResponse>('/api/v1/ai/agents/examination', { query })
    return response.data
  },

  getPlacementAdvisory: async (query?: string): Promise<PlacementAdvisoryResponse> => {
    const response = await api.post<PlacementAdvisoryResponse>('/api/v1/ai/agents/placement', { query })
    return response.data
  },

  // Analytics & Proactive Insights
  getWeeklyBriefing: async (): Promise<WeeklyBriefingResponse> => {
    const response = await api.get<WeeklyBriefingResponse>('/api/v1/ai/analytics/briefing')
    return response.data
  },

  getRiskRadar: async (): Promise<RiskRadarResponse> => {
    const response = await api.get<RiskRadarResponse>('/api/v1/ai/analytics/risk-radar')
    return response.data
  },

  getSmartStudySchedule: async (): Promise<SmartStudyScheduleResponse> => {
    const response = await api.get<SmartStudyScheduleResponse>('/api/v1/ai/analytics/study-schedule')
    return response.data
  },

  // Phase 2: Predictive Intelligence & Academic Recommendations
  getComprehensiveRecommendations: async (): Promise<ComprehensiveRecommendationsResponse> => {
    const response = await api.get<ComprehensiveRecommendationsResponse>('/api/v1/ai/recommendations/comprehensive')
    return response.data
  },

  getAttendanceRiskPrediction: async (): Promise<AttendanceRiskPredictionItem[]> => {
    const response = await api.get<AttendanceRiskPredictionItem[]>('/api/v1/ai/recommendations/attendance-risk')
    return response.data
  },

  getAcademicRiskDetection: async (): Promise<AcademicRiskPredictionItem[]> => {
    const response = await api.get<AcademicRiskPredictionItem[]>('/api/v1/ai/recommendations/academic-risk')
    return response.data
  },

  getPersonalizedStudyRecommendations: async (): Promise<PersonalizedStudyRecommendationItem[]> => {
    const response = await api.get<PersonalizedStudyRecommendationItem[]>('/api/v1/ai/recommendations/study-topics')
    return response.data
  },

  getCourseRecommendations: async (): Promise<CourseRecommendationItem[]> => {
    const response = await api.get<CourseRecommendationItem[]>('/api/v1/ai/recommendations/courses')
    return response.data
  },

  // Phase 4: Enhanced Placement AI
  analyzeResume: async (payload: ResumeAnalysisRequest): Promise<ResumeAnalysisResponse> => {
    const response = await api.post<ResumeAnalysisResponse>('/api/v1/ai/placement/resume/analyze', payload)
    return response.data
  },

  startMockInterview: async (payload: MockInterviewStartRequest): Promise<MockInterviewStartResponse> => {
    const response = await api.post<MockInterviewStartResponse>('/api/v1/ai/placement/interview/start', payload)
    return response.data
  },

  evaluateMockInterview: async (payload: MockInterviewEvaluateRequest): Promise<MockInterviewEvaluateResponse> => {
    const response = await api.post<MockInterviewEvaluateResponse>('/api/v1/ai/placement/interview/evaluate', payload)
    return response.data
  },

  finishMockInterview: async (interviewId: string): Promise<MockInterviewFinishResponse> => {
    const response = await api.post<MockInterviewFinishResponse>(`/api/v1/ai/placement/interview/${interviewId}/finish`)
    return response.data
  },

  getPlacementReadiness: async (): Promise<PlacementReadinessResponse> => {
    const response = await api.get<PlacementReadinessResponse>('/api/v1/ai/placement/readiness')
    return response.data
  },
}

export default aiService
