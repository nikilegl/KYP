import React from 'react'
import { Users } from 'lucide-react'
import type { UserRole } from '../../lib/supabase'

interface UserRoleTagProps {
  userRole: UserRole
  count?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

export function UserRoleTag({ 
  userRole, 
  count, 
  size = 'md', 
  className = '',
  onClick 
}: UserRoleTagProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-2',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-3 text-base gap-3'
  }

  const countSizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-xs',
    lg: 'w-7 h-7 text-sm'
  }

  const baseClasses = `inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`
  const interactiveClasses = onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''

  const backgroundColor = `${userRole.colour}20` // 25% opacity
  const textColor = userRole.colour
  return (
    <div 
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      style={{ 
        backgroundColor,
        color: textColor
      }}
      onClick={onClick}
    >
      {(() => {
        const iconSize = size === 'lg' ? 22 : size === 'md' ? 18 : 14
        
        if (!userRole.icon) {
          return <Users size={iconSize} style={{ color: userRole.colour }} />
        }

        // Check if it's a custom uploaded icon (base64)
        if (userRole.icon.startsWith('data:')) {
          return (
            <img 
              src={userRole.icon} 
              alt="Custom icon" 
              style={{ 
                width: iconSize, 
                height: iconSize, 
                objectFit: 'contain'
              }}
            />
          )
        }
        
        // Render the icon string directly (for emojis or text)
        return (
          <span 
            style={{ 
              fontSize: iconSize,
              lineHeight: 1,
              color: userRole.colour
            }}
          >
            {userRole.icon}
          </span>
        )
      })()}
      <span>{userRole.name}</span>
      {count !== undefined && (
        <div 
          className={`${countSizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: userRole.colour }}
        >
          {count}
        </div>
      )}
    </div>
  )
}