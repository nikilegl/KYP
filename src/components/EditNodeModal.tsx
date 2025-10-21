import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Node } from '@xyflow/react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { SegmentedControl } from './DesignSystem/components/SegmentedControl'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import type { UserRole, ThirdParty } from '../lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

interface EditNodeModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node | null
  isAddingNewNode: boolean
  userRoles: UserRole[]
  thirdParties: ThirdParty[]
  availableRegions: Array<{ id: string; label: string }>
  journeyLayout: 'vertical' | 'horizontal'
  onSave: (formData: NodeFormData) => void
  onDelete?: () => void
}

export interface NodeFormData {
  label: string
  type: 'start' | 'process' | 'decision' | 'end' | 'label'
  variant: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
  thirdPartyName: string
  userRole: UserRole | null
  bulletPoints: string[]
  notifications: Notification[]
  customProperties: Record<string, unknown>
  swimLane: string | null
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
  onSave,
  onDelete
}: EditNodeModalProps) {
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Initialize form state
  const [formData, setFormData] = useState<NodeFormData>({
    label: '',
    type: 'process',
    variant: 'Legl',
    thirdPartyName: '',
    userRole: null,
    bulletPoints: [''],
    notifications: [],
    customProperties: {},
    swimLane: null
  })

  // Update form when node changes
  useEffect(() => {
    if (node && isOpen) {
      const existingBulletPoints = (node.data?.bulletPoints as string[]) || []
      const nodeVariant = node.data?.variant as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
      const resolvedVariant = nodeVariant !== undefined && nodeVariant !== null ? nodeVariant : 'Legl'
      
      setFormData({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        userRole: (node.data?.userRole as UserRole | null) || null,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: (node.data?.notifications as Notification[]) || [],
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
    } else if (isAddingNewNode && isOpen) {
      // Reset form for new node
      setFormData({
        label: '',
        type: 'process',
        variant: 'Legl',
        thirdPartyName: '',
        userRole: null,
        bulletPoints: [''],
        notifications: [],
        customProperties: {},
        swimLane: null
      })
    }
  }, [node, isOpen, isAddingNewNode])

  // Bullet point handlers
  const addBulletPoint = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, '']
    }))
  }, [])

  const updateBulletPoint = useCallback((index: number, newText: string) => {
    setFormData(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.map((bp, i) => i === index ? newText : bp)
    }))
  }, [])

  const removeBulletPoint = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, i) => i !== index)
    }))
  }, [])

  const handleBulletPointKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string) => {
    if (e.key === 'Tab' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      setFormData(prev => ({
        ...prev,
        bulletPoints: [...prev.bulletPoints, '']
      }))
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

  // Custom property handlers
  const addCustomProperty = useCallback(() => {
    const key = prompt('Property name:')
    const value = prompt('Property value:')
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        customProperties: { ...prev.customProperties, [key]: value }
      }))
    }
  }, [])

  const removeCustomProperty = useCallback((key: string) => {
    setFormData(prev => {
      const { [key]: _, ...rest } = prev.customProperties
      return { ...prev, customProperties: rest }
    })
  }, [])

  const handleSave = () => {
    onSave(formData)
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
            <option value="End client">End client</option>
            <option value="CMS">CMS</option>
            <option value="Legl">Legl</option>
            <option value="Back end">Back end</option>
            <option value="Third party">Third party</option>
          </select>
        </div>

        {/* Third Party Name (conditionally shown) */}
        {formData.variant === 'Third party' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Third Party Service
            </label>
            <select
              value={formData.thirdPartyName}
              onChange={(e) => setFormData(prev => ({ ...prev, thirdPartyName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a third party...</option>
              {thirdParties.map(tp => (
                <option key={tp.id} value={tp.name}>
                  {tp.name}
                </option>
              ))}
            </select>
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

        {/* Bullet Points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bullet Points
          </label>
          <div className="space-y-2">
            {formData.bulletPoints.map((bullet, index) => (
              <div key={index} className="flex items-start gap-2 group">
                <span className="text-gray-500 mt-2.5">•</span>
                <input
                  ref={(el) => bulletInputRefs.current[index] = el}
                  type="text"
                  value={bullet}
                  onChange={(e) => updateBulletPoint(index, e.target.value)}
                  onKeyDown={(e) => handleBulletPointKeyDown(e, index, bullet)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter bullet point text"
                />
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => removeBulletPoint(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="small"
              onClick={addBulletPoint}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Bullet Point
            </Button>
          </div>
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

        {/* Node Layout Classification (read-only, for debugging) */}
        {node && (node.data as any)?.nodeLayout && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Layout Classification
            </label>
            <p className="text-sm text-gray-700">
              {(node.data as any).nodeLayout}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This classification is automatically determined by the node's connections after running "Tidy up"
            </p>
          </div>
        )}

        {/* Custom Properties */}
        {Object.keys(formData.customProperties).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Properties
            </label>
            <div className="space-y-2">
              {Object.entries(formData.customProperties).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-sm flex-1">
                    <strong>{key}:</strong> {String(value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => removeCustomProperty(key)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="small"
          onClick={addCustomProperty}
          className="w-full"
        >
          <Plus size={16} className="mr-2" />
          Add Custom Property
        </Button>
      </div>
    </Modal>
  )
}

