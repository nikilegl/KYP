import React from 'react'
import { StakeholderAvatar } from './StakeholderAvatar'
import type { Stakeholder, UserRole } from '../../lib/supabase'

interface StakeholderTagProps {
  stakeholder: Stakeholder
  userRole?: UserRole
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

export function StakeholderTag({ 
  stakeholder, 
  userRole, 
  size = 'md', 
  className = '',
  onClick 
}: StakeholderTagProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-2',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-3 text-base gap-3'
  }

  const baseClasses = `inline-flex items-center rounded-full bg-white border border-gray-300 font-medium text-gray-900 ${sizeClasses[size]}`
  const interactiveClasses = onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      <StakeholderAvatar 
        userRole={userRole} 
        size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'sm'} 
      />
      <span>{stakeholder.name}</span>
    </div>
  )
}