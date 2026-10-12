import api from './api'

export interface DataSourceItem {
  id: number
  name: string
  url?: string
  source_type: string
  category: string
  allowed_domain?: string
  sync_frequency: string
  crawl_depth: number
  max_pages: number
  is_active: boolean
  last_synced_at?: string
  created_at: string
}

export interface CrawlPageItem {
  id: number
  url: string
  title?: string
  content_hash: string
  classification: string
  confidence_score: number
  sync_status: string
  discovered_at: string
}

export interface CrawlJobResult {
  job_id: number
  start_url: string
  status: string
  pages_discovered: number
  pages_crawled: number
  pages_failed: number
  started_at: string
  completed_at?: string
  pages: CrawlPageItem[]
}

export interface ReviewQueueItem {
  id: number
  source_url: string
  record_type: string
  title: string
  extracted_data_json: string
  confidence_score: number
  status: string
  created_at: string
}

export interface SyncDashboardMetrics {
  total_sources: number
  active_sources: number
  total_crawled_pages: number
  pending_review_count: number
  total_knowledge_chunks: number
  last_sync_timestamp?: string
  system_status: string
}

export interface CSVPreviewResult {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows: number
  target_entity: string
  preview_items: Array<{
    row: number
    data: Record<string, string>
    status: string
    error?: string
  }>
  errors: Array<{
    row_number: number
    field_name?: string
    raw_value?: string
    error_message: string
  }>
}

export const dataIngestionService = {
  getDataSources: async (): Promise<DataSourceItem[]> => {
    const response = await api.get<DataSourceItem[]>('/api/v1/admin/university-data/data-sources')
    return response.data
  },

  createDataSource: async (payload: {
    name: string
    url: string
    source_type?: string
    category?: string
    allowed_domain?: string
    sync_frequency?: string
    crawl_depth?: number
    max_pages?: number
  }): Promise<DataSourceItem> => {
    const response = await api.post<DataSourceItem>('/api/v1/admin/university-data/data-sources', payload)
    return response.data
  },

  triggerCrawl: async (sourceId: number): Promise<CrawlJobResult> => {
    const response = await api.post<CrawlJobResult>(`/api/v1/admin/university-data/data-sources/${sourceId}/crawl`)
    return response.data
  },

  getReviewQueue: async (): Promise<ReviewQueueItem[]> => {
    const response = await api.get<ReviewQueueItem[]>('/api/v1/admin/university-data/review-queue')
    return response.data
  },

  reviewAction: async (reviewId: number, action: 'APPROVE' | 'REJECT' | 'PUBLISH', notes?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/api/v1/admin/university-data/review-queue/${reviewId}/action`,
      { action, admin_notes: notes }
    )
    return response.data
  },

  previewCsv: async (raw_csv: string, target_entity: string): Promise<CSVPreviewResult> => {
    const response = await api.post<CSVPreviewResult>('/api/v1/admin/university-data/import/preview', {
      raw_csv,
      target_entity,
    })
    return response.data
  },

  confirmCsv: async (raw_csv: string, target_entity: string): Promise<{ success: boolean; imported_count: number; message: string }> => {
    const response = await api.post<{ success: boolean; imported_count: number; message: string }>(
      '/api/v1/admin/university-data/import/confirm',
      { raw_csv, target_entity }
    )
    return response.data
  },

  getSyncStatus: async (): Promise<SyncDashboardMetrics> => {
    const response = await api.get<SyncDashboardMetrics>('/api/v1/admin/university-data/sync-status')
    return response.data
  },
}

export default dataIngestionService
