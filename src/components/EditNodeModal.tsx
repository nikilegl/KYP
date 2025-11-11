import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import type { UserRole, ThirdParty, Platform } from '../lib/supabase'
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPlatforms } from '../lib/database'
import { EmojiAutocomplete } from './EmojiAutocomplete'

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
  thirdParties: _thirdParties,
  availableRegions,
  journeyLayout,
  existingNodes,
  onSave,
  onDelete
}: EditNodeModalProps) {
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // State for platforms from database
  const [platforms, setPlatforms] = useState<Platform[]>([])
  
  // Internal state for bullet points with stable IDs for drag and drop
  const [bulletPointsWithIds, setBulletPointsWithIds] = useState<BulletPoint[]>([
    { id: `bp-${Date.now()}`, text: '' }
  ])

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
      
      setFormData({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        customPlatformName: (node.data?.customPlatformName as string) || (node.data?.thirdPartyName as string) || '',
        userRole: (node.data?.userRole as UserRole | null) || null,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: notificationsWithDefault,
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
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
        bulletPoints: [''],
        notifications: [{ id: `notif-${Date.now()}`, type: 'info' as const, message: '' }],
        customProperties: {},
        swimLane: null
      })
    }
  }, [node, isOpen, isAddingNewNode, existingNodes])

  // Define handleSave early so it can be used in useEffect
  const handleSave = useCallback(() => {
    // Convert bulletPointsWithIds back to string array
    const bulletPointsAsStrings = bulletPointsWithIds.map(bp => bp.text)
    
    onSave({
      ...formData,
      bulletPoints: bulletPointsAsStrings
    })
  }, [formData, bulletPointsWithIds, onSave])


  // Handle global Enter key press to trigger Save (when not in bullet point input)
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Check if the active element is a bullet point input or emoji autocomplete input
        const activeElement = document.activeElement
        const isBulletPointInput = bulletInputRefs.current.some(ref => ref === activeElement)
        const isInputField = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'
        
        // If not in a bullet point input or emoji autocomplete input, trigger Save
        if (!isBulletPointInput && !isInputField) {
          e.preventDefault()
          handleSave()
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
    
    if (e.key === 'Tab' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      setBulletPointsWithIds(prev => [...prev, { id: `bp-${Date.now()}`, text: '' }])
      setTimeout(() => {
        const newIndex = index + 1
        if (bulletInputRefs.current[newIndex]) {
          bulletInputRefs.current[newIndex]?.focus()
        }
      }, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Add new bullet point below current one
      const newBulletPoint = { id: `bp-${Date.now()}`, text: '' }
      setBulletPointsWithIds(prev => [
        ...prev.slice(0, index + 1),
        newBulletPoint,
        ...prev.slice(index + 1)
      ])
      // Focus on the new bullet point
      setTimeout(() => {
        const newIndex = index + 1
        if (bulletInputRefs.current[newIndex]) {
          bulletInputRefs.current[newIndex]?.focus()
        }
      }, 0)
    }
  }, [updateBulletPoint])

  // Notification handlers
  const addNotification = useCallback(() => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'info',
      message: ''
    }
    setFormData(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification]
    }))
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
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'info',
      message: ''
    }
    setFormData(prev => ({
      ...prev,
      notifications: [
        ...prev.notifications.slice(0, index + 1),
        newNotification,
        ...prev.notifications.slice(index + 1)
      ]
    }))
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
        <div className="grid grid-cols-2 gap-4 border-t py-4 border-b">
          {/* User Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role
            </label>
            <select
              value={formData.userRole?.id || ''}
              onChange={(e) => {
                const role = userRoles.find(r => r.id === e.target.value)
                setFormData(prev => ({ ...prev, userRole: role || null }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role...</option>
              {userRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.icon ? `${role.icon} ${role.name}` : role.name}
                </option>
              ))}
            </select>
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
              {/* Database platforms */}
              {platforms.map(platform => (
                <option key={platform.id} value={platform.name}>
                  {platform.name}
                </option>
              ))}
              {/* Custom option */}
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Custom Platform Name (conditionally shown) */}
        {formData.variant === 'Custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Platform Name
            </label>
            <input
              type="text"
              value={formData.customPlatformName}
              onChange={(e) => setFormData(prev => ({ ...prev, customPlatformName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Stripe, Mailchimp, Twilio..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a custom platform name. If it matches a known third party, we'll show its logo.
            </p>
          </div>
        )}

        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Type
          </label>
          <div className="grid grid-cols-4 gap-3">
            {/* Start Node */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'start' }))}
              className={`relative px-3 py-2 pb-4 border-2 rounded-lg transition-all ${
                formData.type === 'start'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="h-1"></div>
                <span className="font-medium text-sm">Start</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-current border-2 border-white"></div>
              </div>
            </button>

            {/* Middle Node */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'process' }))}
              className={`relative px-3 py-2 pb-4 pt-4 border-2 rounded-lg transition-all ${
                formData.type === 'process'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-current border-2 border-white"></div>
                <span className="font-medium text-sm">Middle</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-current border-2 border-white"></div>
              </div>
            </button>

            {/* End Node */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'end' }))}
              className={`relative px-3 py-2 pt-4 border-2 rounded-lg transition-all ${
                formData.type === 'end'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-current border-2 border-white"></div>
                <span className="font-medium text-sm">End</span>
                <div className="h-1"></div>
              </div>
            </button>

            {/* Label Node */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'label' }))}
              className={`relative px-3 py-2 border-2 rounded-lg transition-all ${
                formData.type === 'label'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="h-1"></div>
                <span className="font-medium text-sm">Label</span>
                <div className="h-1"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

