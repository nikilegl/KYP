import { useState } from 'react'
import { Plus, Server, Database, Zap, User, Globe, ExternalLink, Cloud, Cpu, HardDrive, Monitor } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, type Column } from './DesignSystem/components/DataTable'
import { PlatformForm } from './PlatformManager/PlatformForm'
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

  const handleDelete = async (platform: Platform) => {
    if (!window.confirm(`Are you sure you want to delete the platform "${platform.name}"? This action cannot be undone.`)) {
      return
    }
    await onDeletePlatform(platform.id)
  }

  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, typeof Server> = {
      'Server': Server,
      'Database': Database,
      'Zap': Zap,
      'User': User,
      'Globe': Globe,
      'ExternalLink': ExternalLink,
      'Cloud': Cloud,
      'Cpu': Cpu,
      'HardDrive': HardDrive,
      'Monitor': Monitor
    }
    
    const IconComponent = iconMap[iconName || 'Server'] || Server
    return IconComponent
  }

  // Define columns for DataTable
  const columns: Column<Platform>[] = [
    {
      key: 'platform',
      header: 'Platform',
      sortable: true,
      width: '30%',
      render: (platform) => {
        const IconComponent = getIcon(platform.icon)
        return (
          <div className="flex items-center">
            <div 
              className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: platform.colour }}
            >
              <IconComponent size={20} className="text-white" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {platform.name}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'description',
      header: 'Description',
      width: '35%',
      render: (platform) => (
        <div className="text-sm text-gray-500">
          {platform.description || '-'}
        </div>
      )
    },
    {
      key: 'colour',
      header: 'Colour',
      width: '20%',
      render: (platform) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: platform.colour }}
          />
          <span className="text-sm text-gray-500 font-mono">
            {platform.colour}
          </span>
        </div>
      )
    },
    {
      key: 'icon',
      header: 'Icon',
      width: '15%',
      render: (platform) => (
        <div className="text-sm text-gray-500">
          {platform.icon || 'Server'}
        </div>
      )
    }
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platforms</h1>
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

      {/* Platforms Table */}
      <DataTable<Platform>
        data={platforms}
        columns={columns}
        sortableFields={['name']}
        getItemId={(platform) => platform.id}
        onEdit={openEditModal}
        onDelete={handleDelete}
        emptyStateIcon={Server as any}
        emptyStateMessage="No platforms yet. Click 'Add Platform' to create your first platform."
      />

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

