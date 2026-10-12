import React, { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      fullWidth = true,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className={`space-y-1.5 ${fullWidth ? 'w-full' : 'inline-block'}`}>
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={generatedId}
            disabled={disabled}
            className={`w-full appearance-none bg-white text-xs text-slate-900 border rounded-lg px-3 py-2 pr-9 focus:outline-hidden focus:ring-2 transition-all ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
                : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
            } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
