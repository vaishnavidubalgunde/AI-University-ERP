import React from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  title?: string
  message?: string
  description?: string
  subMessage?: string
  fullScreen?: boolean
  skeletonCount?: number
}

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  return <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]} ${className}`} />
}

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200/80 rounded-md ${className}`} />
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title,
  message = 'Loading data...',
  description,
  subMessage = 'Please wait while we fetch the latest records',
  fullScreen = false,
  skeletonCount,
}) => {
  const displayTitle = title || message
  const displaySub = description || subMessage

  if (skeletonCount && skeletonCount > 0) {
    return (
      <div className="w-full space-y-3 p-4">
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center ${
        fullScreen ? 'fixed inset-0 bg-white/80 backdrop-blur-xs z-50' : 'w-full py-16'
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
        <LoadingSpinner size="lg" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{displayTitle}</h3>
      {displaySub && <p className="text-xs text-slate-500 mt-1 max-w-sm">{displaySub}</p>}
    </div>
  )
}

export default LoadingState
