import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { PlatformForm } from './PlatformManager/PlatformForm'
import { PlatformTable } from './PlatformManager/PlatformTable'
import type { Platform } from '../lib/supabase'

interface PlatformManagerProps {
  platforms: Platform[]
  onCreatePlatform: (name: string, colour: string, icon?: string, description?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; icon?: string; description?: string }) => Promise<boolean>
  onDeletePlatform: (platformId: string) => Promise<void>
}

export function PlatformManager({ 
  platforms, 
  onCreatePlatform, 
  onUpdatePlatform, 
  onDeletePlatform
}: PlatformManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [formData, setFormData] = useState({ 
    name: '', 
    colour: '#3B82F6', 
    icon: 'Server',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreatePlatform(
        formData.name, 
        formData.colour, 
        formData.icon,
        formData.description
      )
      setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating platform:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedPlatform) return
    
    setSaving(true)
    try {
      const success = await onUpdatePlatform(selectedPlatform.id, {
        name: formData.name,
        colour: formData.colour,
        icon: formData.icon,
        description: formData.description
      })
      
      if (success) {
        setShowEditModal(false)
        setSelectedPlatform(null)
        setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
      } else {
        console.error('Failed to update platform')
      }
    } catch (error) {
      console.error('Error updating platform:', error)
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (platform: Platform) => {
    setSelectedPlatform(platform)
    setFormData({
      name: platform.name,
      colour: platform.colour,
      icon: platform.icon || 'Server',
      description: platform.description || ''
    })
    setShowEditModal(true)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage platform variants for your workspace
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Platform
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Platforms Table */}
          <PlatformTable
            platforms={platforms}
            onEdit={openEditModal}
            onDelete={onDeletePlatform}
          />
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
        }}
        title="Create Platform"
        size="md"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? 'Creating...' : 'Create Platform'}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <PlatformForm
            platform={formData}
            setPlatform={setFormData}
            isModal={true}
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPlatform(null)
          setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
        }}
        title="Edit Platform"
        size="md"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false)
                setSelectedPlatform(null)
                setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEdit}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <PlatformForm
            platform={formData}
            setPlatform={setFormData}
            isModal={true}
          />
        </div>
      </Modal>
    </div>
  )
}

