import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  description?: string
  onRetry?: () => void
  retryText?: string
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load information',
  message,
  description,
  onRetry,
  retryText = 'Try Again',
  className = '',
}) => {
  const displayMsg = description || message || 'An unexpected error occurred while communicating with the university ERP server.'

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-rose-100 shadow-2xs ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3.5 text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">{displayMsg}</p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {retryText}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ErrorState
