import React, { useState, useEffect, useCallback } from 'react'
import { User, UserRole, LoginCredentials } from '../types/auth'
import authService from '../services/authService'
import { AuthContext } from './AuthContextTypes'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getUser())
  const [token, setToken] = useState<string | null>(() => authService.getToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Verify authentication on mount
  useEffect(() => {
    let isMounted = true
    const initAuth = async () => {
      const storedToken = authService.getToken()
      if (storedToken) {
        try {
          const freshUser = await authService.getMe()
          if (isMounted) {
            setUser(freshUser)
            setToken(storedToken)
          }
        } catch {
          if (isMounted) {
            authService.removeToken()
            setUser(null)
            setToken(null)
          }
        }
      }
      if (isMounted) {
        setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login(credentials)
      setUser(response.user)
      setToken(response.token.access_token)
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string })?.message || 'Login failed. Please check your credentials.'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.removeToken()
    setUser(null)
    setToken(null)
    setError(null)
  }, [])

  const demoLogin = useCallback(async (role: UserRole) => {
    const demoCredentials: Record<UserRole, LoginCredentials> = {
      student: { email: 'alex.kumar@univ.edu', password: 'student123' },
      faculty: { email: 'dr.sharma@univ.edu', password: 'faculty123' },
      admin: { email: 'admin@univ.edu', password: 'admin123' },
    }
    await login(demoCredentials[role])
  }, [login])

  const isStudent = user?.role === 'student'
  const isFaculty = user?.role === 'faculty'
  const isAdmin = user?.role === 'admin'

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        login,
        logout,
        demoLogin,
        isStudent,
        isFaculty,
        isAdmin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
