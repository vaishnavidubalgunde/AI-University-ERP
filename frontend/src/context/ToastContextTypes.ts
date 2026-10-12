import { createContext } from 'react'
import { ToastItem } from '../components/ui/Toast'

export interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)
