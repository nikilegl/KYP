import React from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Edit, Trash2, Copy } from 'lucide-react'
import { UserRoleTag } from '../../common/UserRoleTag'
import type { UserRole } from '../../../lib/supabase'

export type UserJourneyNodeType = 'start' | 'process' | 'decision' | 'end'

export interface UserJourneyNodeData {
  label: string
  type: UserJourneyNodeType
  userRole?: UserRole
  bulletPoints?: string[]
  customProperties?: Record<string, unknown>
  variant?: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
  thirdPartyName?: string
}

interface UserJourneyNodeProps extends NodeProps<UserJourneyNodeData> {
  selected?: boolean
  showHandles?: boolean
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export function UserJourneyNode({ id, data, selected, showHandles = false, onEdit, onDuplicate, onDelete }: UserJourneyNodeProps) {
  const {
    label,
    type,
    userRole,
    bulletPoints = [],
    customProperties = {},
    variant = 'Legl',
    thirdPartyName = ''
  } = data || {}
  
  // Generate unique gradient ID for Legl logo
  const gradientId = `legl-gradient-${id}`

  // Platform-specific border color
  const getBorderColor = () => {
    if (variant === 'End client') {
      return '#4A70FA'
    } else if (variant === 'Legl') {
      return '#01B88E'
    } else {
      return '#5A6698'
    }
  }

  const borderColor = getBorderColor()

  // Handle positioning for different node types
  const getHandlePositions = () => {
    switch (type) {
      case 'start':
        return [
          { type: 'source', position: Position.Bottom, id: 'bottom' }
        ]
      case 'process':
        return [
          { type: 'target', position: Position.Top, id: 'top' },
          { type: 'source', position: Position.Bottom, id: 'bottom' }
        ]
      case 'decision':
        return [
          { type: 'target', position: Position.Top, id: 'top' },
          { type: 'source', position: Position.Right, id: 'right' },
          { type: 'source', position: Position.Bottom, id: 'bottom' }
        ]
      case 'end':
        return [
          { type: 'target', position: Position.Top, id: 'top' }
        ]
      default:
        return []
    }
  }

  // Get type label
  const getTypeLabel = () => {
    switch (type) {
      case 'start':
        return 'Start'
      case 'process':
        return 'Middle'
      case 'decision':
        return 'Decision'
      case 'end':
        return 'End'
      default:
        return type
    }
  }

  return (
    <div
      className={`
        px-4 py-3
        w-[320px]
        bg-white
        border border-gray-200
        rounded-lg
        ${selected ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-md' : ''}
        transition-all duration-200
        hover:shadow-md
        ${customProperties.disabled ? 'opacity-50' : ''}
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: borderColor
      }}
    >
      {/* Connection Handles - only show when in React Flow context */}
      {showHandles && getHandlePositions().map((handle) => (
        <Handle
          key={handle.id}
          type={handle.type as 'source' | 'target'}
          position={handle.position}
          id={handle.id}
          className="w-4 h-4 !bg-gray-400 !border-2 !border-white"
        />
      ))}

      {/* Main content row: Title + Bullets on left, Action buttons on right */}
      <div className="flex items-start justify-between gap-3">
        {/* Left column: Title and bullet points */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-900 break-words">
            {label}
          </div>
          
          {/* Bullet Points */}
          {bulletPoints && bulletPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {bulletPoints.map((bullet, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="flex-1">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column: Action buttons stacked vertically */}
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-150"
            title="Edit node"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate?.()
            }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors duration-150"
            title="Duplicate node"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              console.log('Delete button clicked, onDelete:', onDelete)
              if (onDelete) {
                console.log('Calling onDelete')
                onDelete()
              } else {
                console.log('onDelete is undefined')
              }
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
            title="Delete node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* User Role Tag and Platform Label */}
      {(userRole || variant) && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            {userRole && (
              <UserRoleTag
                userRole={userRole}
                size="sm"
              />
            )}
          </div>
          <div>
            {variant && (
              variant === 'Legl' ? (
                <div className="w-10 h-5">
                  <svg viewBox="0 0 39 21" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id={gradientId} x1="39.7" y1="-.8" x2=".8" y2="22.2" gradientTransform="translate(0 22) scale(1 -1)" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#01b88e"/>
                        <stop offset=".9" stopColor="#86dbc8"/>
                      </linearGradient>
                    </defs>
                    <path fill={`url(#${gradientId})`} d="M10.1.7h18.4c5.5,0,10,4.5,10,10h0c0,5.5-4.5,10-10,10H10.1C4.6,20.7.1,16.2.1,10.7H.1C.1,5.2,4.6.7,10.1.7Z"/>
                    <path fill="#fff" d="M27.1,7.9c0,0,.1,0,.1.1v.7s0,4.6,0,4.6c0,.5,0,.9-.1,1.3-.4,1.1-1.3,1.9-2.3,2.2-.3,0-.6.1-.9.1,0,0,0,0,0,0-1.2,0-2.3-.6-2.9-1.6,0-.2.1-.8.4-.7.3.2,1.3.7,2.1.7s1.2-.3,1.5-.5c.2-.2.4-.7.4-1.2v-.2h0c-.4.5-1,.9-1.9.9-1.5,0-2.9-1.1-2.9-3.1,0-2,1.4-3.1,2.9-3.1,1,0,1.6.5,1.9.9v-.6s0,0,0-.1c.5-.4,1.2-.6,1.8-.6h0ZM30,4.7c0,0,.1,0,.1.1v8.8s0,0,0,.1c-.6.4-1.2.6-2,.6h0c0,0-.1,0-.1-.1V5.5s0,0,0-.1c.6-.4,1.2-.6,2-.6h0ZM16.7,8c1.8,0,3.1,1.2,3.1,3s0,.7,0,.7h-4.4c0,.2,0,.3.1.4,0,.1.1.2.2.3.2.2.6.5,1.4.5.8,0,1.8-.5,2.1-.7.2-.1.5.2.4.4-.6,1-1.7,1.8-2.9,1.8-1.5,0-2.7-1-3.2-2.3,0-.3,0-.6,0-.9,0-2.1,1.5-3.2,3.3-3.2ZM10.4,5.5c0,0,.1,0,.1.1v6.9s0,0,0,0h2.4s0,0,0,0c.3.4.5,1,.5,1.5h0c0,0,0,.1-.1.1h-4.4c-.3,0-.5-.2-.5-.5v-7.4h0,0s.3-.8,1.9-.8ZM23.9,9.9c-.9,0-1.5.7-1.5,1.5s.6,1.5,1.5,1.5c.9,0,1.4-.7,1.4-1.5s-.6-1.5-1.4-1.5ZM16.7,9.3c-.8,0-1.3.7-1.3,1.2h2.5c0-.6-.4-1.2-1.3-1.2Z"/>
                  </svg>
                </div>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {variant === 'Third party' && thirdPartyName ? thirdPartyName : variant}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* Custom Properties */}
      {Object.keys(customProperties).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
          {Object.entries(customProperties).map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              <span className="font-medium">{key}:</span>
              <span className="ml-1">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
