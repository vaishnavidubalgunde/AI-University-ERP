import { createContext } from 'react'
import { User, UserRole, LoginCredentials } from '../types/auth'

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  demoLogin: (role: UserRole) => Promise<void>
  isStudent: boolean
  isFaculty: boolean
  isAdmin: boolean
  hasRole: (roles: UserRole[]) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
