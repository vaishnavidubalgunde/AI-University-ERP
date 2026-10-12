import api from './api'

export interface AuditLogItem {
  id: number
  user_id?: number
  action: string
  resource: string
  resource_id?: string
  details?: string
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export interface LoginActivityItem {
  id: number
  user_id: number
  email: string
  ip_address?: string
  browser?: string
  device?: string
  status: string
  timestamp: string
}

export const auditService = {
  getLogs: async (limit: number = 50, action?: string): Promise<AuditLogItem[]> => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (action) params.append('action', action)
    const response = await api.get<AuditLogItem[]>(`/api/v1/audit/logs?${params.toString()}`)
    return response.data
  },

  getLoginActivities: async (limit: number = 50): Promise<LoginActivityItem[]> => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    const response = await api.get<LoginActivityItem[]>(`/api/v1/audit/login-activities?${params.toString()}`)
    return response.data
  },
}

export default auditService
