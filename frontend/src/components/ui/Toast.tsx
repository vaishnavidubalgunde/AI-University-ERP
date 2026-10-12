import React from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface ToastProps {
  toast: ToastItem
  onClose: (id: string) => void
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  }

  const borders = {
    success: 'border-emerald-200 bg-white text-slate-900',
    error: 'border-rose-200 bg-white text-slate-900',
    info: 'border-blue-200 bg-white text-slate-900',
    warning: 'border-amber-200 bg-white text-slate-900',
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 w-80 p-3.5 rounded-xl border shadow-lg transition-all animate-in slide-in-from-top-2 duration-200 ${borders[toast.type]}`}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <h6 className="text-xs font-bold text-slate-900 leading-tight">{toast.title}</h6>
        {toast.message && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{toast.message}</p>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default Toast
