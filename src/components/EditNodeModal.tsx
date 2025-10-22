import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { SegmentedControl } from './DesignSystem/components/SegmentedControl'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import type { UserRole, ThirdParty, Platform } from '../lib/supabase'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPlatforms } from '../lib/database'

interface EditNodeModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node | null
  isAddingNewNode: boolean
  userRoles: UserRole[]
  thirdParties: ThirdParty[] // Kept for future validation/suggestions
  availableRegions: Array<{ id: string; label: string }>
  journeyLayout: 'vertical' | 'horizontal'
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
  onUpdate: (index: number, text: string) => void
  onRemove: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, bullet: string) => void
  inputRef: (el: HTMLInputElement | null) => void
}

function SortableBulletPoint({ id, bullet, index, onUpdate, onRemove, onKeyDown, inputRef }: SortableBulletPointProps) {
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

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group">
      <button
        type="button"
        className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-1.5"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <span className="text-gray-500 mt-2.5 text-l">•</span>
      <input
        ref={inputRef}
        type="text"
        value={bullet}
        onChange={(e) => onUpdate(index, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, index, bullet)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        placeholder="Enter bullet point text"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Remove bullet point"
      >
        <Trash2 size={14} />
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
  onSave,
  onDelete
}: EditNodeModalProps) {
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const labelInputRef = useRef<HTMLInputElement>(null)
  
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
      
      setFormData({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        customPlatformName: (node.data?.customPlatformName as string) || (node.data?.thirdPartyName as string) || '',
        userRole: (node.data?.userRole as UserRole | null) || null,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: (node.data?.notifications as Notification[]) || [],
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
    } else if (isAddingNewNode && isOpen) {
      // Reset form for new node
      setBulletPointsWithIds([{ id: `bp-${Date.now()}`, text: '' }])
      
      setFormData({
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
    }
  }, [node, isOpen, isAddingNewNode])

  // Auto-focus the label input when modal opens
  useEffect(() => {
    if (isOpen && labelInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        labelInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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

  const handleBulletPointKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string) => {
    if (e.key === 'Tab' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      setBulletPointsWithIds(prev => [...prev, { id: `bp-${Date.now()}`, text: '' }])
      setTimeout(() => {
        const newIndex = index + 1
        if (bulletInputRefs.current[newIndex]) {
          bulletInputRefs.current[newIndex]?.focus()
        }
      }, 0)
    }
  }, [])

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

  // Drag and drop handler for bullet points
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBulletPointsWithIds((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  const handleSave = () => {
    // Convert bulletPointsWithIds back to string array
    const bulletPointsAsStrings = bulletPointsWithIds.map(bp => bp.text)
    
    onSave({
      ...formData,
      bulletPoints: bulletPointsAsStrings
    })
  }

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
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label
          </label>
          <input
            ref={labelInputRef}
            type="text"
            value={formData.label}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node label"
          />
        </div>

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
                {role.name}
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
            <option value="">None</option>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bullet Points
          </label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
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
                    onUpdate={updateBulletPoint}
                    onRemove={removeBulletPoint}
                    onKeyDown={handleBulletPointKeyDown}
                    inputRef={(el) => bulletInputRefs.current[index] = el}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            size="small"
            onClick={addBulletPoint}
            className="w-full mt-2"
          >
            <Plus size={16} className="mr-2" />
            Add Bullet Point
          </Button>
        </div>

        {/* Notifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notifications
          </label>
          <div className="space-y-3">
            {formData.notifications.map((notification) => {
              const colors = getNotificationColor(notification.type)
              return (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <select
                      value={notification.type}
                      onChange={(e) => updateNotification(notification.id, 'type', e.target.value)}
                      className={`flex-1 px-2 py-1 text-xs border rounded ${colors.border} ${colors.text} bg-white`}
                    >
                      <option value="pain-point">🔴 Pain Point</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="info">ℹ️ Info</option>
                      <option value="positive">✅ Positive</option>
                    </select>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={notification.message}
                    onChange={(e) => updateNotification(notification.id, 'message', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded ${colors.border} ${colors.text} bg-white`}
                    placeholder="Enter notification message"
                  />
                </div>
              )
            })}
            <Button
              variant="outline"
              size="small"
              onClick={addNotification}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Notification
            </Button>
          </div>
        </div>

        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Type
          </label>
          <SegmentedControl
            options={[
              { value: 'start', label: 'Start' },
              { value: 'process', label: 'Middle' },
              { value: 'end', label: 'End' },
              { value: 'label', label: 'Label' }
            ]}
            value={formData.type}
            onChange={(value) => setFormData(prev => ({ ...prev, type: value as NodeFormData['type'] }))}
          />
        </div>
      </div>
    </Modal>
  )
}

