import React from 'react'

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'gray' | 'white' | 'blue' | 'green' | 'red'
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'gray',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  }

  const colorClasses = {
    gray: 'border-gray-600',
    white: 'border-white',
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600'
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        border-t-transparent
        rounded-full
        animate-spin
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-label="Loading"
    />
  )
}

// Loading state wrapper component for centered loading states
export function LoadingState({
  message,
  size = 'md',
  className = ''
}: {
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-3">
        <LoadingSpinner size={size} />
        {message && <span className="text-gray-600">{message}</span>}
      </div>
    </div>
  )
}

