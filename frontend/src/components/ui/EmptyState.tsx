import React from 'react'
import { FolderOpen } from 'lucide-react'
import Button from './Button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  actionText?: string
  onAction?: () => void
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No records found',
  description = 'There is currently no data available to display for this section.',
  actionText,
  onAction,
  action,
  className = '',
}) => {
  const btnLabel = action?.label || actionText
  const btnClick = action?.onClick || onAction

  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center bg-white rounded-xl border border-dashed border-slate-300 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3.5 text-slate-400">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {btnLabel && btnClick && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={btnClick}>
            {btnLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export default EmptyState
