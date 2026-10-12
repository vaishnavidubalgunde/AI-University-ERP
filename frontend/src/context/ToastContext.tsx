import React, { useState, useCallback, useId } from 'react'
import Toast, { ToastItem } from '../components/ui/Toast'
import { ToastContext } from './ToastContextTypes'

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const baseId = useId()

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${baseId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const newToast: ToastItem = { id, type, title, message, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [baseId, removeToast]
  )

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast])
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast])
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast])
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
