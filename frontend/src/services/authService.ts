import apiClient from './api'
import { AuthResponse, LoginCredentials, Token, User } from '../types/auth'

const TOKEN_KEY = 'univ_erp_access_token'
const USER_KEY = 'univ_erp_user_data'

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
  confirm_password: string
  student_id?: string
  department: string
  program?: string
  semester?: number
  phone?: string
  role?: 'student' | 'faculty'
}

export interface RegisterResult {
  success: boolean
  message: string
  user_id: number
  email: string
  requires_verification: boolean
  verification_token?: string
}

export const authService = {
  // Store token in localStorage
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  // API calls
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', credentials)
    const { token, user } = response.data
    authService.setToken(token.access_token)
    authService.setUser(user)
    return response.data
  },

  register: async (payload: RegisterPayload): Promise<RegisterResult> => {
    const response = await apiClient.post<RegisterResult>('/api/v1/auth/register', payload)
    return response.data
  },

  verifyEmail: async (token: string): Promise<{ success: boolean; message: string; email: string }> => {
    const response = await apiClient.get<{ success: boolean; message: string; email: string }>(
      `/api/v1/auth/verify-email?token=${token}`
    )
    return response.data
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; reset_token?: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string; reset_token?: string }>(
      '/api/v1/auth/forgot-password',
      { email }
    )
    return response.data
  },

  resetPassword: async (token: string, new_password: string, confirm_password: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/v1/auth/reset-password',
      { token, new_password, confirm_password }
    )
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/v1/auth/me')
    authService.setUser(response.data)
    return response.data
  },

  refreshToken: async (): Promise<Token> => {
    const response = await apiClient.post<Token>('/api/v1/auth/refresh')
    authService.setToken(response.data.access_token)
    return response.data
  },

  seedDemoUsers: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/seed')
  },
}

export default authService
