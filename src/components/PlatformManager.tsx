import { useState, useRef } from 'react'
import { Plus, Server, Database, Zap, User, Globe, ExternalLink, Cloud, Cpu, HardDrive, Monitor } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, type Column } from './DesignSystem/components/DataTable'
import { PlatformForm } from './PlatformManager/PlatformForm'
import type { Platform } from '../lib/supabase'

interface PlatformManagerProps {
  platforms: Platform[]
  onCreatePlatform: (name: string, colour: string, icon?: string, description?: string, logo?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; icon?: string; description?: string; logo?: string }) => Promise<boolean>
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
    description: '',
    logo: ''
  })
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (SVG preferred, but allow images)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setUploadingLogo(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        
        // If it's an SVG, store as text, otherwise as base64
        if (file.type === 'image/svg+xml') {
          // Read as text for SVG
          const textReader = new FileReader()
          textReader.onload = (evt) => {
            const svgText = evt.target?.result as string
            setFormData(prev => ({ ...prev, logo: svgText }))
            setUploadingLogo(false)
          }
          textReader.readAsText(file)
        } else {
          setFormData(prev => ({ ...prev, logo: result }))
          setUploadingLogo(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setUploadingLogo(false)
      alert('Failed to upload logo')
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await onCreatePlatform(
        formData.name, 
        formData.colour, 
        formData.icon,
        formData.description,
        formData.logo
      )
      setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
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
        description: formData.description,
        logo: formData.logo
      })
      
      if (success) {
        setShowEditModal(false)
        setSelectedPlatform(null)
        setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
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
      description: platform.description || '',
      logo: platform.logo || ''
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

  const renderLogo = (logo?: string) => {
    if (!logo) return null
    
    // If it's SVG content
    if (logo.includes('<svg')) {
      return <div className="w-8 h-8 flex items-center justify-center mr-3" dangerouslySetInnerHTML={{ __html: logo }} />
    }
    
    // If it's a base64 image
    return <img src={logo} alt="Logo" className="w-8 h-8 object-contain mr-3" />
  }

  // Define columns for DataTable
  const columns: Column<Platform>[] = [
    {
      key: 'platform',
      header: 'Platform',
      sortable: true,
      render: (platform) => {
        const IconComponent = getIcon(platform.icon)
        return (
          <div className="flex items-center min-w-0">
            {platform.logo ? (
              renderLogo(platform.logo)
            ) : (
              <div 
                className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mr-3"
                style={{ backgroundColor: platform.colour }}
              >
                <IconComponent size={16} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {platform.name}
              </div>
              {platform.description && (
                <div className="text-xs text-gray-500 truncate">
                  {platform.description}
                </div>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'colour',
      header: 'Color',
      render: (platform) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: platform.colour }}
          />
          <span className="text-xs text-gray-500 font-mono">
            {platform.colour}
          </span>
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
        tableLayout="auto"
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
        }}
        title="Create Platform"
        size="md"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
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
            uploadingLogo={uploadingLogo}
            onLogoUpload={handleLogoUpload}
            fileInputRef={fileInputRef}
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPlatform(null)
          setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
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
                setFormData({ name: '', colour: '#3B82F6', icon: 'Server', description: '', logo: '' })
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
            uploadingLogo={uploadingLogo}
            onLogoUpload={handleLogoUpload}
            fileInputRef={editFileInputRef}
          />
        </div>
      </Modal>
    </div>
  )
}

