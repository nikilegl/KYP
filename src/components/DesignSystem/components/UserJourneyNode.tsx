import { Handle, Position } from '@xyflow/react'
import { Edit } from 'lucide-react'
import { UserRoleTag } from '../../common/UserRoleTag'
import type { UserRole, ThirdParty } from '../../../lib/supabase'

export type UserJourneyNodeType = 'start' | 'process' | 'decision' | 'end' | 'label'

export type NotificationType = 'pain-point' | 'warning' | 'info' | 'positive'

export interface Notification {
  id: string
  type: NotificationType
  message: string
}

export interface UserJourneyNodeData {
  label: string
  type: UserJourneyNodeType
  userRole?: UserRole
  bulletPoints?: string[]
  notifications?: Notification[]
  customProperties?: Record<string, unknown>
  variant?: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | 'Custom' | ''
  thirdPartyName?: string
  customPlatformName?: string
  nodeLayout?: string // Layout classification: 'Simple node', 'Branch node', 'Branch-child node', 'Convergent node', 'Divergent node'
  journeyLayout?: 'vertical' | 'horizontal' // Overall journey layout direction
}

interface UserJourneyNodeProps {
  id: string
  data: UserJourneyNodeData
  selected?: boolean
  showHandles?: boolean
  thirdParties?: ThirdParty[]
  onEdit?: () => void
}

export function UserJourneyNode({ id, data, selected, showHandles = false, thirdParties = [], onEdit }: UserJourneyNodeProps) {
  const nodeData = data as UserJourneyNodeData
  const {
    label = '',
    type = 'process',
    userRole,
    bulletPoints = [],
    notifications = [],
    customProperties = {},
    variant = 'Legl',
    thirdPartyName = '',
    customPlatformName = '',
    journeyLayout = 'vertical'
  } = nodeData || {}
  
  // Get notification styling based on type
  const getNotificationStyle = (notifType: NotificationType) => {
    switch (notifType) {
      case 'pain-point':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-900',
        }
      case 'info':
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-700',
        }
      case 'positive':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-800',
        }
    }
  }
  
  // Find matching third party logo (case-insensitive)
  // Check for matching third party for either 'Third party' or 'Custom' variant
  const platformName = variant === 'Custom' ? customPlatformName : thirdPartyName
  const matchingThirdParty = thirdParties.find(
    tp => tp.name.toLowerCase() === platformName.toLowerCase()
  )
  
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

  // Handle positioning for different node types and layout orientation
  const getHandlePositions = () => {
    const isHorizontal = journeyLayout === 'horizontal'
    
    // For horizontal layout, use Left/Right instead of Top/Bottom
    const sourcePos = isHorizontal ? Position.Right : Position.Bottom
    const targetPos = isHorizontal ? Position.Left : Position.Top
    const sourceId = isHorizontal ? 'right' : 'bottom'
    const targetId = isHorizontal ? 'left' : 'top'
    
    switch (type) {
      case 'start':
        return [
          { type: 'source', position: sourcePos, id: sourceId }
        ]
      case 'process':
        return [
          { type: 'target', position: targetPos, id: targetId },
          { type: 'source', position: sourcePos, id: sourceId }
        ]
      case 'decision':
        // For decision nodes, keep the branch behavior
        if (isHorizontal) {
          return [
            { type: 'target', position: Position.Left, id: 'left' },
            { type: 'source', position: Position.Right, id: 'right' },
            { type: 'source', position: Position.Bottom, id: 'bottom' }
          ]
        } else {
          return [
            { type: 'target', position: Position.Top, id: 'top' },
            { type: 'source', position: Position.Right, id: 'right' },
            { type: 'source', position: Position.Bottom, id: 'bottom' }
          ]
        }
      case 'end':
        return [
          { type: 'target', position: targetPos, id: targetId }
        ]
      case 'label':
        // Label nodes have no connectors - they're for adding context only
        return []
      default:
        return []
    }
  }

  return (
    <div
      data-id={id}
      className={`
        group
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
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit?.()
      }}
    >
      {/* Connection Handles - only show when in React Flow context and not a label node */}
      {showHandles && type !== 'label' && getHandlePositions().map((handle) => (
        <Handle
          key={handle.id}
          type={handle.type as 'source' | 'target'}
          position={handle.position}
          id={handle.id}
          isConnectable={true}
          style={{
            width: '16px',
            height: '16px',
            background: '#9ca3af',
            border: '2px solid white',
            zIndex: 10
          }}
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
          {bulletPoints && bulletPoints.filter(b => b && b.trim()).length > 0 && (
            <ul className="mt-2 space-y-1">
              {bulletPoints.filter(b => b && b.trim()).map((bullet, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="flex-1">{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Notifications */}
          {notifications && notifications.length > 0 && (
            <div className={`space-y-1.5 ${bulletPoints.filter(b => b && b.trim()).length > 0 ? 'mt-2' : 'mt-2'}`}>
              {notifications.map((notification) => {
                const style = getNotificationStyle(notification.type)
                return (
                  <div
                    key={notification.id}
                    className={`
                      ${style.bg} ${style.border} ${style.text}
                      border rounded px-2 py-1.5
                      text-xs
                    `}
                  >
                    <span>{notification.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: Edit button only - Hidden by default, visible on hover */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
        </div>
      </div>

      {/* User Role Tag and Platform Label - Hidden for label nodes */}
      {type !== 'label' && (userRole || variant) && (
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
              ) : ((variant === 'Third party' && thirdPartyName) || (variant === 'Custom' && customPlatformName)) && matchingThirdParty?.logo ? (
                // Show third party logo if available (for both Third party and Custom variants)
                <div className="flex items-center justify-center h-5">
                  {matchingThirdParty.logo.includes('<svg') ? (
                    <div 
                      className="h-5 flex items-center"
                      dangerouslySetInnerHTML={{ __html: matchingThirdParty.logo }}
                    />
                  ) : (
                    <img 
                      src={matchingThirdParty.logo} 
                      alt={platformName}
                      className="h-5 object-contain"
                    />
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {variant === 'Custom' && customPlatformName ? customPlatformName : variant === 'Third party' && thirdPartyName ? thirdPartyName : variant}
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
