import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'slate'
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  progress?: {
    current: number
    max: number
    label?: string
    color?: string
  }
  badge?: string
  onClick?: () => void
  className?: string
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  trend,
  progress,
  badge,
  onClick,
  className = '',
}) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200/60 ring-blue-500/10',
    purple: 'bg-purple-50 text-purple-600 border-purple-200/60 ring-purple-500/10',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 ring-emerald-500/10',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/60 ring-amber-500/10',
    rose: 'bg-rose-50 text-rose-600 border-rose-200/60 ring-rose-500/10',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/60 ring-slate-500/10',
  }

  const trendIcon = {
    up: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
    down: <TrendingDown className="w-3.5 h-3.5 text-rose-600" />,
    neutral: <Minus className="w-3.5 h-3.5 text-slate-500" />,
  }

  const trendColor = {
    up: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
    down: 'text-rose-700 bg-rose-50 border-rose-200/60',
    neutral: 'text-slate-600 bg-slate-50 border-slate-200/60',
  }

  const progressPercent = progress ? Math.min(100, Math.max(0, (progress.current / progress.max) * 100)) : 0

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {badge}
              </span>
            )}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        </div>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ring-4 shrink-0 ${colorStyles[iconColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progress && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-slate-500">
            <span>{progress.label || 'Progress'}</span>
            <span>{progress.current} / {progress.max} ({Math.round(progressPercent)}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.color || (progressPercent >= 75 ? 'bg-emerald-500' : progressPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500')
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {(trend || subtitle) && !progress && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-semibold ${trendColor[trend.direction]}`}>
              {trendIcon[trend.direction]}
              <span>{trend.value}</span>
            </div>
          )}
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}

export default StatsCard
