import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Node } from '@xyflow/react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import type { UserRole, ThirdParty, Platform } from '../lib/supabase'
import { Plus, Trash2, GripVertical, ChevronDown, Check } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPlatforms } from '../lib/database'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { AddThirdPartyModal } from './AddThirdPartyModal'

interface EditNodeModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node | null
  isAddingNewNode: boolean
  userRoles: UserRole[]
  thirdParties: ThirdParty[] // Kept for future validation/suggestions
  availableRegions: Array<{ id: string; label: string }>
  journeyLayout: 'vertical' | 'horizontal'
  existingNodes: Node[] // List of existing nodes to determine default node type
  onSave: (formData: NodeFormData) => void
  onDelete?: () => void
  userRoleEmojiOverrides?: Record<string, string> // Journey-specific emoji overrides: { roleId: emoji }
  onUpdateEmojiOverride?: (roleId: string, emoji: string) => void // Callback to update emoji override for all nodes
  workspaceId: string // Workspace ID for creating third parties
  onThirdPartyCreated?: (thirdParty: ThirdParty) => void // Callback when a third party is created
}

interface BulletPoint {
  id: string
  text: string
}

export interface NodeFormData {
  label: string
  type: 'start' | 'process' | 'decision' | 'end' | 'label'
  variant: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Custom' | ''
  thirdPartyName: string
  customPlatformName: string
  userRole: UserRole | null
  customUserRoleName: string
  customUserRoleEmoji: string
  bulletPoints: string[]
  notifications: Notification[]
  customProperties: Record<string, unknown>
  swimLane: string | null
}

// Sortable Bullet Point Component
interface SortableBulletPointProps {
  id: string
  bullet: string
  index: number
  totalCount: number
  onUpdate: (index: number, text: string) => void
  onRemove: (index: number) => void
  onInsert: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, bullet: string) => void
  inputRef: (el: HTMLInputElement | null) => void
}

function SortableBulletPoint({ id, bullet, index, totalCount, onUpdate, onRemove, onInsert, onKeyDown, inputRef }: SortableBulletPointProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const showDragHandle = totalCount > 1

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">•</span>
        <input
          ref={inputRef}
          type="text"
          value={bullet}
          onChange={(e) => onUpdate(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index, bullet)}
          className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Enter bullet point text"
        />
      </div>
      {showDragHandle && (
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded transition-colors"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Remove bullet point"
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onInsert(index)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Add bullet point below"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// Sortable Notification Component
interface SortableNotificationProps {
  notification: Notification
  index: number
  totalCount: number
  colors: { bg: string; border: string; text: string; name: string }
  onUpdate: (id: string, field: 'type' | 'message', value: string) => void
  onRemove: (id: string) => void
  onInsert: (index: number) => void
}

function SortableNotification({ notification, index, totalCount, colors, onUpdate, onRemove, onInsert }: SortableNotificationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notification.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const showDragHandle = totalCount > 1

  // Get emoji for notification type
  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'pain-point': return '🔴'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'positive': return '✅'
      default: return 'ℹ️'
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div className={`flex-1 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={notification.type}
              onChange={(e) => onUpdate(notification.id, 'type', e.target.value)}
              className="appearance-none px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer text-transparent"
              style={{ width: '4rem' }}
            >
              <option value="pain-point">🔴 Pain Point</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="positive">✅ Positive</option>
            </select>
            <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
              <span className="text-lg">{getNotificationEmoji(notification.type)}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
          <input
            type="text"
            value={notification.message}
            onChange={(e) => onUpdate(notification.id, 'message', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            placeholder="Enter notification message"
          />
        </div>
      </div>
      {showDragHandle && (
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded transition-colors"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(notification.id)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Remove notification"
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onInsert(index)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Add notification below"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function EditNodeModal({
  isOpen,
  onClose,
  node,
  isAddingNewNode,
  userRoles,
  thirdParties,
  availableRegions,
  journeyLayout,
  existingNodes,
  onSave,
  onDelete,
  userRoleEmojiOverrides = {},
  onUpdateEmojiOverride,
  workspaceId,
  onThirdPartyCreated
}: EditNodeModalProps) {
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Track if custom user role is selected
  const [isCustomUserRoleSelected, setIsCustomUserRoleSelected] = useState(false)
  
  // Local state for emoji input to allow free editing
  const [emojiInputValue, setEmojiInputValue] = useState<Record<string, string>>({})
  
  // State for platforms from database
  const [platforms, setPlatforms] = useState<Platform[]>([])
  
  // Internal state for bullet points with stable IDs for drag and drop
  const [bulletPointsWithIds, setBulletPointsWithIds] = useState<BulletPoint[]>([
    { id: `bp-${Date.now()}`, text: '' }
  ])

  // State for third party validation and modal
  const [showAddThirdPartyModal, setShowAddThirdPartyModal] = useState(false)
  const [matchedThirdParty, setMatchedThirdParty] = useState<ThirdParty | null>(null)
  const [isValidatingThirdParty, setIsValidatingThirdParty] = useState(false)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize form state
  const [formData, setFormData] = useState<NodeFormData>({
    label: '',
    type: 'process',
    variant: 'Legl',
    thirdPartyName: '',
    customPlatformName: '',
    userRole: null,
    customUserRoleName: '',
    customUserRoleEmoji: '',
    bulletPoints: [''],
    notifications: [],
    customProperties: {},
    swimLane: null
  })
  
  // Load platforms on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      const platformsData = await getPlatforms()
      setPlatforms(platformsData)
    }
    loadPlatforms()
  }, [])

  // Sort platforms in the desired order
  const sortedPlatforms = useMemo(() => {
    const order = ['Legl', 'Legl End Client Platform', 'Legl Email', 'Back end', 'CMS']
    const ordered: Platform[] = []
    const unordered: Platform[] = []
    
    // First, add platforms in the specified order
    order.forEach(name => {
      const platform = platforms.find(p => p.name === name)
      if (platform) {
        ordered.push(platform)
      }
    })
    
    // Then add any remaining platforms that aren't in the order list
    platforms.forEach(platform => {
      if (!order.includes(platform.name)) {
        unordered.push(platform)
      }
    })
    
    return [...ordered, ...unordered]
  }, [platforms])

  // Update form when node changes
  useEffect(() => {
    if (node && isOpen) {
      const existingBulletPoints = (node.data?.bulletPoints as string[]) || []
      let nodeVariant = node.data?.variant as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | 'Custom' | ''
      
      // Convert old 'Third party' to new 'Custom'
      if (nodeVariant === 'Third party') {
        nodeVariant = 'Custom'
      }
      
      const resolvedVariant = nodeVariant !== undefined && nodeVariant !== null ? nodeVariant : 'Legl'
      
      // Convert bullet points to objects with IDs
      const bulletPointsWithNewIds: BulletPoint[] = existingBulletPoints.length > 0
        ? existingBulletPoints.map((text, index) => ({ id: `bp-${Date.now()}-${index}`, text }))
        : [{ id: `bp-${Date.now()}`, text: '' }]
      
      setBulletPointsWithIds(bulletPointsWithNewIds)
      
      const existingNotifications = (node.data?.notifications as Notification[]) || []
      const notificationsWithDefault = existingNotifications.length > 0 
        ? existingNotifications 
        : [{ id: `notif-${Date.now()}`, type: 'info' as const, message: '' }]
      
      const customUserRoleName = (node.data?.customUserRoleName as string) || ''
      // If this node doesn't have an emoji but other nodes with the same custom role name do, use that emoji
      let customUserRoleEmoji = (node.data?.customUserRoleEmoji as string) || ''
      if (customUserRoleName && !customUserRoleEmoji) {
        // Find another node with the same custom user role name that has an emoji
        const nodeWithEmoji = existingNodes.find(
          n => n.data?.customUserRoleName === customUserRoleName && n.data?.customUserRoleEmoji
        )
        if (nodeWithEmoji) {
          customUserRoleEmoji = (nodeWithEmoji.data?.customUserRoleEmoji as string) || ''
        }
      }
      setFormData({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        customPlatformName: (node.data?.customPlatformName as string) || (node.data?.thirdPartyName as string) || '',
        userRole: (node.data?.userRole as UserRole | null) || null,
        customUserRoleName: customUserRoleName,
        customUserRoleEmoji: customUserRoleEmoji,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: notificationsWithDefault,
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
      // Set custom user role selected state if customUserRoleName exists
      setIsCustomUserRoleSelected(!!customUserRoleName)
    } else if (isAddingNewNode && isOpen) {
      // Reset form for new node with one empty notification by default
      setBulletPointsWithIds([{ id: `bp-${Date.now()}`, text: '' }])
      
      // Filter out highlight regions when checking for existing nodes
      const regularNodes = existingNodes.filter(n => n.type !== 'highlightRegion')
      // If there are no nodes yet, default to 'start', otherwise 'process'
      const defaultType = regularNodes.length === 0 ? 'start' : 'process'
      
      setFormData({
        label: '',
        type: defaultType,
        variant: 'Legl',
        thirdPartyName: '',
        customPlatformName: '',
        userRole: null,
        customUserRoleName: '',
        customUserRoleEmoji: '',
        bulletPoints: [''],
        notifications: [{ id: `notif-${Date.now()}`, type: 'info' as const, message: '' }],
        customProperties: {},
        swimLane: null
      })
      
      setIsCustomUserRoleSelected(false)
    }
    
    // Cleanup validation timeout on unmount or close
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [node, isOpen, isAddingNewNode, existingNodes])
  
  // Cleanup validation timeout when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
      setMatchedThirdParty(null)
      setIsValidatingThirdParty(false)
      setShowAddThirdPartyModal(false)
    }
  }, [isOpen])

  // Sync emoji input value when user role changes (but not when override changes to allow editing)
  useEffect(() => {
    if (formData.userRole && onUpdateEmojiOverride) {
      const roleId = formData.userRole.id
      // Only initialize if we don't have a value for this role yet
      if (emojiInputValue[roleId] === undefined) {
        const hasOverride = roleId in userRoleEmojiOverrides
        const initialEmoji = hasOverride 
          ? userRoleEmojiOverrides[roleId] 
          : (formData.userRole.icon || '')
        setEmojiInputValue(prev => ({
          ...prev,
          [roleId]: initialEmoji
        }))
      }
    }
  }, [formData.userRole?.id])

  // Define handleSave early so it can be used in useEffect
  const handleSave = useCallback(() => {
    // Convert bulletPointsWithIds back to string array
    const bulletPointsAsStrings = bulletPointsWithIds.map(bp => bp.text)
    
    onSave({
      ...formData,
      bulletPoints: bulletPointsAsStrings
    })
  }, [formData, bulletPointsWithIds, onSave])


  // Handle global Enter key press to trigger Save (when not in textarea or select)
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement
        const isTextarea = activeElement?.tagName === 'TEXTAREA'
        const isSelect = activeElement?.tagName === 'SELECT'
        
        // Check if emoji picker is open (look for the picker dropdown in the DOM)
        const emojiPicker = document.querySelector('.emoji-picker-dropdown')
        const isEmojiPickerOpen = emojiPicker !== null
        
        // Don't trigger Save if emoji picker is open - let the picker handle Enter key
        if (isEmojiPickerOpen) {
          return
        }
        
        // Trigger Save for all inputs except textareas and selects
        // Bullet point inputs will be handled by their own onKeyDown handler
        if (!isTextarea && !isSelect) {
          // Check if it's already handled by a bullet point input
          const isBulletPointInput = bulletInputRefs.current.some(ref => ref === activeElement)
          if (!isBulletPointInput) {
            e.preventDefault()
            handleSave()
          }
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isOpen, handleSave])

  // Bullet point handlers
  const addBulletPoint = useCallback(() => {
    setBulletPointsWithIds(prev => [...prev, { id: `bp-${Date.now()}`, text: '' }])
  }, [])

  const updateBulletPoint = useCallback((index: number, newText: string) => {
    setBulletPointsWithIds(prev => prev.map((bp, i) => i === index ? { ...bp, text: newText } : bp))
  }, [])

  const removeBulletPoint = useCallback((index: number) => {
    setBulletPointsWithIds(prev => prev.filter((_, i) => i !== index))
  }, [])

  const insertBulletPoint = useCallback((index: number) => {
    const newBulletPoint = { id: `bp-${Date.now()}`, text: '' }
    setBulletPointsWithIds(prev => [
      ...prev.slice(0, index + 1),
      newBulletPoint,
      ...prev.slice(index + 1)
    ])
  }, [])

  const handleBulletPointKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string) => {
    // Handle Command+B or Ctrl+B for bold formatting
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      const input = e.currentTarget
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      
      if (start !== end) {
        // Text is selected, wrap it with **
        const selectedText = value.substring(start, end)
        const beforeText = value.substring(0, start)
        const afterText = value.substring(end)
        const newValue = `${beforeText}**${selectedText}**${afterText}`
        
        updateBulletPoint(index, newValue)
        
        // Restore cursor position after the closing **
        setTimeout(() => {
          if (bulletInputRefs.current[index]) {
            const newCursorPos = start + selectedText.length + 4 // **text** = 4 extra chars
            bulletInputRefs.current[index]?.setSelectionRange(newCursorPos, newCursorPos)
            bulletInputRefs.current[index]?.focus()
          }
        }, 0)
      }
      return
    }
    
    // Tab key: only add new bullet point if this is the last bullet point
    if (e.key === 'Tab' && !e.shiftKey) {
      // Use functional update to get current state
      setBulletPointsWithIds(prev => {
        const isLastBulletPoint = index === prev.length - 1
        if (isLastBulletPoint) {
          e.preventDefault()
          const newBulletPoint = { id: `bp-${Date.now()}`, text: '' }
          setTimeout(() => {
            const newIndex = index + 1
            if (bulletInputRefs.current[newIndex]) {
              bulletInputRefs.current[newIndex]?.focus()
            }
          }, 0)
          return [...prev, newBulletPoint]
        }
        // If not the last bullet point, let Tab work normally (move to next field)
        return prev
      })
      return
    }
    
    // Enter key: trigger Save button
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleSave()
    }
  }, [updateBulletPoint, handleSave])

  // Notification handlers
  const addNotification = useCallback(() => {
    setFormData(prev => {
      // Get the type of the last notification, or default to 'info' if no notifications exist
      const lastNotificationType = prev.notifications.length > 0 
        ? prev.notifications[prev.notifications.length - 1].type 
        : 'info'
      
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: lastNotificationType,
        message: ''
      }
      return {
        ...prev,
        notifications: [...prev.notifications, newNotification]
      }
    })
  }, [])

  const updateNotification = useCallback((id: string, field: 'type' | 'message', value: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === id ? { ...notif, [field]: value } : notif
      )
    }))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.filter(notif => notif.id !== id)
    }))
  }, [])

  const insertNotification = useCallback((index: number) => {
    setFormData(prev => {
      // Get the type of the notification at the current index (the one we're inserting after)
      // or default to 'info' if no notifications exist
      const previousNotificationType = prev.notifications.length > 0 && index >= 0 && index < prev.notifications.length
        ? prev.notifications[index].type 
        : prev.notifications.length > 0
          ? prev.notifications[prev.notifications.length - 1].type
          : 'info'
      
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: previousNotificationType,
        message: ''
      }
      return {
        ...prev,
        notifications: [
          ...prev.notifications.slice(0, index + 1),
          newNotification,
          ...prev.notifications.slice(index + 1)
        ]
      }
    })
  }, [])

  // Drag and drop handler for bullet points
  const handleBulletDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBulletPointsWithIds((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  // Drag and drop handler for notifications
  const handleNotificationDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const notifications = [...prev.notifications]
        const oldIndex = notifications.findIndex((item) => item.id === active.id)
        const newIndex = notifications.findIndex((item) => item.id === over.id)
        
        return {
          ...prev,
          notifications: arrayMove(notifications, oldIndex, newIndex)
        }
      })
    }
  }, [])

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'pain-point':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', name: 'Pain Point' }
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', name: 'Warning' }
      case 'info':
        return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', name: 'Info' }
      case 'positive':
        return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', name: 'Positive' }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddingNewNode ? 'Add Node' : 'Edit Node'}
      size="lg"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex justify-between items-center">
          {/* Delete button on the left - only show when editing existing node */}
          <div>
            {!isAddingNewNode && onDelete && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this node?')) {
                    onDelete()
                    onClose()
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
          
          {/* Cancel and Save buttons on the right */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
          </label>
          <EmojiAutocomplete
            value={formData.label}
            onChange={(value) => setFormData(prev => ({ ...prev, label: value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node label"
            autoFocus={isOpen && isAddingNewNode}
          />
        </div>

        {/* Swim Lane (Region) - only for horizontal layouts */}
        {journeyLayout === 'horizontal' && availableRegions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swim Lane (Region)
            </label>
            <select
              value={formData.swimLane || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, swimLane: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {availableRegions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bullet Points with Drag and Drop */}
        <div>
    
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBulletDragEnd}
          >
            <SortableContext
              items={bulletPointsWithIds.map(bp => bp.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {bulletPointsWithIds.map((bulletPoint, index) => (
                  <SortableBulletPoint
                    key={bulletPoint.id}
                    id={bulletPoint.id}
                    bullet={bulletPoint.text}
                    index={index}
                    totalCount={bulletPointsWithIds.length}
                    onUpdate={updateBulletPoint}
                    onRemove={removeBulletPoint}
                    onInsert={insertBulletPoint}
                    onKeyDown={handleBulletPointKeyDown}
                    inputRef={(el) => bulletInputRefs.current[index] = el}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
         
        </div>

        {/* Notifications */}
        <div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleNotificationDragEnd}
          >
            <SortableContext
              items={formData.notifications.map(notif => notif.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {formData.notifications.map((notification, index) => (
                  <SortableNotification
                    key={notification.id}
                    notification={notification}
                    index={index}
                    totalCount={formData.notifications.length}
                    colors={getNotificationColor(notification.type)}
                    onUpdate={updateNotification}
                    onRemove={removeNotification}
                    onInsert={insertNotification}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
         
        </div>

        {/* User Role and Platform - Side by side */}
        <div className="grid grid-cols-2 gap-4 border-t py-4">
          {/* User Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role
            </label>
            <select
              value={formData.customUserRoleName ? 'custom' : (formData.userRole?.id || '')}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomUserRoleSelected(true)
                  setFormData(prev => ({ ...prev, userRole: null, customUserRoleName: prev.customUserRoleName || '' }))
                } else {
                  setIsCustomUserRoleSelected(false)
                  const role = userRoles.find(r => r.id === e.target.value)
                  setFormData(prev => ({ ...prev, userRole: role || null, customUserRoleName: '' }))
                  
                  // Initialize emoji input value for the selected role
                  if (role) {
                    const hasOverride = role.id in userRoleEmojiOverrides
                    const initialEmoji = hasOverride 
                      ? userRoleEmojiOverrides[role.id] 
                      : (role.icon || '')
                    setEmojiInputValue(prev => ({
                      ...prev,
                      [role.id]: initialEmoji
                    }))
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role...</option>
              <option value="custom">*Custom</option>
              {userRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            
            {/* Emoji selector for selected user role */}
            {formData.userRole && onUpdateEmojiOverride && (() => {
              const roleId = formData.userRole.id
              const hasOverride = roleId in userRoleEmojiOverrides
              // Use local input value if it exists, otherwise use override or global emoji
              const currentEmoji = emojiInputValue[roleId] !== undefined
                ? emojiInputValue[roleId]
                : (hasOverride 
                    ? userRoleEmojiOverrides[roleId] 
                    : (formData.userRole.icon || ''))
              
              return (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Emoji for this role
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <EmojiAutocomplete
                        value={currentEmoji}
                        onChange={(value) => {
                          if (formData.userRole) {
                            // Update local state immediately for responsive UI
                            setEmojiInputValue(prev => ({
                              ...prev,
                              [roleId]: value
                            }))
                            // Update the override
                            onUpdateEmojiOverride(roleId, value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        placeholder="Select emoji..."
                      />
                    </div>
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.userRole && onUpdateEmojiOverride) {
                            // Remove override to use global emoji
                            onUpdateEmojiOverride(roleId, '')
                            // Reset local input value to global emoji
                            setEmojiInputValue(prev => ({
                              ...prev,
                              [roleId]: formData.userRole!.icon || ''
                            }))
                          }
                        }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Reset to global emoji"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This emoji will be used for all nodes with this role in this journey.
                  </p>
                </div>
              )
            })()}
          </div>

          {/* Platform/Variant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={formData.variant}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                variant: e.target.value as NodeFormData['variant']
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a platform...</option>
              {/* Custom option */}
              <option value="Custom">*Custom</option>
              {/* Database platforms */}
              {sortedPlatforms.map(platform => (
                <option key={platform.id} value={platform.name}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom User Role Name (conditionally shown) */}
        {(isCustomUserRoleSelected || formData.customUserRoleName) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom User Role Name
            </label>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <EmojiAutocomplete
                  key={`emoji-${formData.customUserRoleName}`}
                  value={formData.customUserRoleEmoji || ''}
                  onChange={(value) => {
                    // Allow clearing the emoji by setting empty string
                    setFormData(prev => ({ ...prev, customUserRoleEmoji: value || '' }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder=":"
                />
              </div>
              <div className="flex-1">
                <EmojiAutocomplete
                  value={formData.customUserRoleName}
                  onChange={(value) => setFormData(prev => ({ ...prev, customUserRoleName: value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter custom user role name"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter a custom user role name. The emoji will be applied to all nodes with this role name.
            </p>
          </div>
        )}

        {/* Custom Platform Name (conditionally shown) */}
        {formData.variant === 'Custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Platform Name <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
            </label>
            <div className="relative">
              <EmojiAutocomplete
                value={formData.customPlatformName}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, customPlatformName: value }))
                  
                  // Clear previous timeout
                  if (validationTimeoutRef.current) {
                    clearTimeout(validationTimeoutRef.current)
                  }
                  
                  // Reset validation state
                  setMatchedThirdParty(null)
                  setIsValidatingThirdParty(false)
                  
                  // If empty, don't validate
                  if (!value.trim()) {
                    return
                  }
                  
                  // Set validating state
                  setIsValidatingThirdParty(true)
                  
                  // Debounce validation - wait 1 second after user stops typing
                  validationTimeoutRef.current = setTimeout(() => {
                    // Check if platform name matches any existing third party (case-insensitive)
                    const trimmedValue = value.trim()
                    const matched = thirdParties.find(
                      tp => tp.name.toLowerCase().trim() === trimmedValue.toLowerCase()
                    )
                    
                    setMatchedThirdParty(matched || null)
                    setIsValidatingThirdParty(false)
                  }, 1000)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="e.g., Stripe, Mailchimp, Twilio..."
              />
              {/* Validation indicator */}
              {formData.customPlatformName.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidatingThirdParty ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  ) : matchedThirdParty ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setShowAddThirdPartyModal(true)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      Add logo
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {matchedThirdParty 
                ? `Matches existing third party: ${matchedThirdParty.name}`
                : "Enter a custom platform name. If it matches a known third party, we'll show its logo."}
            </p>
          </div>
        )}

      </div>

      {/* Add Third Party Modal */}
      <AddThirdPartyModal
        isOpen={showAddThirdPartyModal}
        onClose={() => setShowAddThirdPartyModal(false)}
        onSuccess={(thirdParty) => {
          // Update matched third party
          setMatchedThirdParty(thirdParty)
          // Notify parent component if callback provided
          if (onThirdPartyCreated) {
            onThirdPartyCreated(thirdParty)
          }
          // Close modal
          setShowAddThirdPartyModal(false)
        }}
        workspaceId={workspaceId}
        initialName={formData.customPlatformName.trim()}
      />
    </Modal>
  )
}

