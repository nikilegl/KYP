import React from 'react'
import { Users } from 'lucide-react'
import type { UserRole } from '../../lib/supabase'

interface UserRoleIconDisplayProps {
  userRole: UserRole
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserRoleIconDisplay({ 
  userRole, 
  size = 'md', 
  className = ''
}: UserRoleIconDisplayProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  }

  const renderIcon = () => {
    const iconColor = userRole.colour
    const iconSize = iconSizes[size]

    if (!userRole.icon) {
      return <Users size={iconSize} style={{ color: iconColor }} />
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
          color: iconColor
        }}
      >
        {userRole.icon}
      </span>
    )
  }

  const backgroundColor = `${userRole.colour}20` // 25% opacity

  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center ${className}`}
      style={{ backgroundColor }}
    >
      {renderIcon()}
    </div>
  )
}