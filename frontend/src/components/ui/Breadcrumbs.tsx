import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
}

export interface BreadcrumbsProps {
  items: (string | BreadcrumbItem)[]
  onHomeClick?: () => void
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onHomeClick,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs text-slate-500 select-none ${className}`}>
      <button
        onClick={onHomeClick}
        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors rounded p-0.5"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const itemObj: BreadcrumbItem = typeof item === 'string' ? { label: item } : item

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 truncate" aria-current="page">
                {itemObj.label}
              </span>
            ) : (
              <button
                onClick={itemObj.onClick}
                className="hover:text-blue-600 transition-colors truncate max-w-[140px]"
              >
                {itemObj.label}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
