export interface NoticeItem {
  id: number
  title: string
  content: string
  category: 'academic' | 'examination' | 'placement' | 'events' | 'general' | string
  priority: 'low' | 'normal' | 'high' | 'urgent' | string
  publisher: string
  target_role: string
  created_at: string
  attachment_url?: string
  is_urgent: boolean
  is_pinned: boolean
}

export interface NoticeFilterResponse {
  total_count: number
  categories: string[]
  notices: NoticeItem[]
}
