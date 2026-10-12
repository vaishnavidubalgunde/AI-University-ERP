import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

export interface AlertBannerProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  onDismiss?: () => void
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  action,
  className = '',
}) => {
  const styles = {
    info: {
      container: 'bg-blue-50/90 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      actionBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
      closeBtn: 'text-blue-500 hover:text-blue-700 hover:bg-blue-100/60',
    },
    success: {
      container: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      actionBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      closeBtn: 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100/60',
    },
    warning: {
      container: 'bg-amber-50/90 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      actionBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
      closeBtn: 'text-amber-500 hover:text-amber-700 hover:bg-amber-100/60',
    },
    error: {
      container: 'bg-rose-50/90 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
      actionBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
      closeBtn: 'text-rose-500 hover:text-rose-700 hover:bg-rose-100/60',
    },
  }

  const current = styles[variant]

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 shadow-2xs flex items-start gap-3 transition-all ${current.container} ${className}`}
    >
      {current.icon}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-bold text-xs tracking-wide uppercase mb-1">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
        {action && (
          <div className="mt-3">
            <button
              onClick={action.onClick}
              className={`px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-colors ${current.actionBtn}`}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-1 rounded-md transition-colors ${current.closeBtn}`}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default AlertBanner
