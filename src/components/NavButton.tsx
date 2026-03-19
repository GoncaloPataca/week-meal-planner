import React from 'react'

const BASE =
  'btn-themed flex-shrink-0 rounded-lg border transition-colors duration-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-400'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'icon' = square p-2 pad; 'text' = px-3 py-2 with small font */
  variant?: 'icon' | 'text'
}

export default function NavButton({ variant = 'icon', className = '', ...props }: Props) {
  const variantClass = variant === 'text'
    ? 'px-3 py-2 text-sm font-medium'
    : 'p-2'
  return (
    <button
      {...props}
      className={`${BASE} ${variantClass} ${className}`}
    />
  )
}
