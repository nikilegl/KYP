import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, type LucideIcon } from 'lucide-react'
import { Button } from './Button'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
  divider?: boolean
}

export interface OptionsMenuProps {
  items: MenuItem[]
  align?: 'left' | 'right'
  className?: string
  buttonClassName?: string
}

export function OptionsMenu({ items, align = 'right', className = '', buttonClassName = '' }: OptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 whitespace-nowrap ${buttonClassName}`}
        title="More options"
      >
        <MoreVertical size={16} />
      </Button>
      
      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50`}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && index > 0 && (
                <div className="border-t border-gray-200 my-1" />
              )}
              <button
                onClick={() => {
                  item.onClick()
                  setIsOpen(false)
                }}
                disabled={item.disabled}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                  item.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon && <item.icon size={16} />}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

