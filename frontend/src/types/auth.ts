export type UserRole = 'student' | 'faculty' | 'admin'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  department?: string
  student_id?: string
  semester?: number
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface Token {
  access_token: string
  token_type: string
  expires_in: number
}

export interface AuthResponse {
  token: Token
  user: User
}

export interface LoginCredentials {
  email?: string
  username?: string
  password: string
}
