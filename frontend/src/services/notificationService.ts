import api from './api'

export interface NotificationItem {
  id: number
  title: string
  message: string
  category: 'academic' | 'examination' | 'finance' | 'notice' | 'security' | 'system'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_read: boolean
  action_url?: string
  created_at: string
}

export interface NotificationListResponse {
  unread_count: number
  total_count: number
  notifications: NotificationItem[]
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>('/api/v1/notifications')
    return response.data
  },

  markAsRead: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(`/api/v1/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/v1/notifications/read-all')
    return response.data
  },

  broadcastNotification: async (payload: { title: string; message: string; category?: string; priority?: string; user_id?: number }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/api/v1/notifications/broadcast', payload)
    return response.data
  },
}

export default notificationService
