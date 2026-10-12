import api from './api'
import { NoticeFilterResponse } from '../types/notice'

export const noticeService = {
  getNotices: async (category?: string, search?: string): Promise<NoticeFilterResponse> => {
    const params: Record<string, string> = {}
    if (category && category !== 'All') params.category = category.toLowerCase()
    if (search) params.search = search

    const response = await api.get<NoticeFilterResponse>('/api/v1/notices', { params })
    return response.data
  },
}

export default noticeService
