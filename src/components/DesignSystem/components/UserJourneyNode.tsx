import React from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Edit, Trash2 } from 'lucide-react'
import { UserRoleTag } from '../../common/UserRoleTag'
import type { UserRole } from '../../../lib/supabase'

export type UserJourneyNodeType = 'start' | 'process' | 'decision' | 'end'

export interface UserJourneyNodeData {
  label: string
  type: UserJourneyNodeType
  userRole?: UserRole
  bulletPoints?: string[]
  customProperties?: Record<string, unknown>
  variant?: 'CMS' | 'Legl' | 'End client' | 'Back end' | ''
}

interface UserJourneyNodeProps extends NodeProps<UserJourneyNodeData> {
  selected?: boolean
  showHandles?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function UserJourneyNode({ data, selected, showHandles = false, onEdit, onDelete }: UserJourneyNodeProps) {
  const {
    label,
    type,
    userRole,
    bulletPoints = [],
    customProperties = {},
    variant = ''
  } = data || {}

  // Type-specific colors for icons and tags
  const typeColors = {
    start: {
      icon: '#10B981',
      iconBg: '#D1FAE5',
      tag: '#10B981',
      tagBg: '#D1FAE5',
      tagText: '#065F46'
    },
    process: {
      icon: '#3B82F6',
      iconBg: '#DBEAFE',
      tag: '#3B82F6',
      tagBg: '#DBEAFE',
      tagText: '#1E40AF'
    },
    decision: {
      icon: '#F59E0B',
      iconBg: '#FEF3C7',
      tag: '#F59E0B',
      tagBg: '#FEF3C7',
      tagText: '#92400E'
    },
    end: {
      icon: '#EF4444',
      iconBg: '#FEE2E2',
      tag: '#EF4444',
      tagBg: '#FEE2E2',
      tagText: '#991B1B'
    }
  }

  const colors = typeColors[type] || typeColors.process

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
        min-w-[280px]
        bg-white
        border border-gray-200
        rounded-lg
        shadow-sm
        ${selected ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-md' : ''}
        transition-all duration-200
        hover:shadow-md
        ${customProperties.disabled ? 'opacity-50' : ''}
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: colors.icon
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

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-900 truncate">
            {label}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            title="Edit node"
          >
            <Edit size={14} />
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
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            title="Delete node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Bullet Points */}
      {bulletPoints && bulletPoints.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <ul className="space-y-1">
            {bulletPoints.map((bullet, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">•</span>
                <span className="flex-1">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                {variant}
              </span>
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
