import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface HealthCheckResponse {
  status: string
  service: string
  version: string
  environment?: string
  timestamp?: string
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('univ_erp_access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const customError = {
      message: (error.response?.data as { detail?: string })?.detail || error.message || 'An unexpected error occurred',
      status: error.response?.status || 500,
      data: error.response?.data,
    }
    return Promise.reject(customError)
  }
)

export const systemService = {
  getHealth: async (): Promise<HealthCheckResponse> => {
    const response = await apiClient.get<HealthCheckResponse>('/api/health')
    return response.data
  },
}

export default apiClient
