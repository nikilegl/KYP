import { useState, useMemo } from 'react'
import { Plus, Server, Search } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { DataTable, type Column } from './DesignSystem/components/DataTable'
import { AddPlatformModal } from './AddPlatformModal'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import type { Platform } from '../lib/supabase'

interface PlatformManagerProps {
  platforms: Platform[]
  loading?: boolean
  onCreatePlatform: (name: string, colour: string, logo?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; logo?: string }) => Promise<boolean>
  onDeletePlatform: (platformId: string) => Promise<void>
}

export function PlatformManager({ 
  platforms, 
  loading = false,
  onCreatePlatform, 
  onUpdatePlatform, 
  onDeletePlatform
}: PlatformManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handlePlatformCreated = async (platform: Platform) => {
    // Platform is already created by AddPlatformModal
    // Add it to the parent's state by calling onCreatePlatform
    // This will add it to the local state (even though it's already in DB)
    // The createPlatform call will either succeed (if no duplicate) or fail gracefully
    try {
      await onCreatePlatform(
        platform.name,
        platform.colour || '#5A6698',
        platform.logo
      )
    } catch (error) {
      // If platform already exists, that's okay - it was already created by AddPlatformModal
      // We still want to close the modal
      console.log('Platform may already exist, but that\'s expected')
    }
    setShowCreateModal(false)
  }

  const handlePlatformUpdated = async (platform: Platform) => {
    // Platform is already updated by AddPlatformModal
    // Refresh the parent's state
    if (selectedPlatform) {
      await onUpdatePlatform(selectedPlatform.id, {
        name: platform.name,
        colour: platform.colour,
        logo: platform.logo
      })
    }
    setShowEditModal(false)
    setSelectedPlatform(null)
  }

  const openEditModal = (platform: Platform) => {
    setSelectedPlatform(platform)
    setShowEditModal(true)
  }

  const handleDelete = async (platform: Platform) => {
    if (!window.confirm(`Are you sure you want to delete the platform "${platform.name}"? This action cannot be undone.`)) {
      return
    }
    await onDeletePlatform(platform.id)
  }

  const renderLogo = (logo?: string) => {
    if (!logo) return null
    
    // If it's SVG content
    if (logo.includes('<svg') || logo.startsWith('<?xml')) {
      return <div className="w-16 h-16 flex items-center justify-center mr-3" dangerouslySetInnerHTML={{ __html: logo }} />
    }
    
    // If it's a base64 image
    return <img src={logo} alt="Logo" className="w-16 h-16 object-contain mr-3" />
  }

  // Filter and sort platforms based on search query
  const filteredPlatforms = useMemo(() => {
    let filtered = platforms
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = platforms.filter(platform => 
        platform.name.toLowerCase().includes(query)
      )
    }
    
    // Sort by name alphabetically
    return [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0
    })
  }, [platforms, searchQuery])

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <LoadingState message="Loading platforms..." size="lg" />
      </div>
    )
  }

  // Define columns for DataTable
  const columns: Column<Platform>[] = [
    {
      key: 'platform',
      header: 'Platform',
      sortable: true,
      render: (platform) => {
        return (
          <div className="flex items-center min-w-0">
            {platform.logo ? (
              renderLogo(platform.logo)
            ) : (
              <div 
                className="flex-shrink-0 h-16 w-16 rounded-lg flex items-center justify-center mr-3"
                style={{ backgroundColor: platform.colour }}
              >
                <span className="text-white text-lg font-medium">
                  {platform.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {platform.name}
              </div>
            </div>
          </div>
        )
      }
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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search platforms..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Platforms Table */}
      <DataTable<Platform>
        data={filteredPlatforms}
        columns={columns}
        sortableFields={['name']}
        getItemId={(platform) => platform.id}
        onEdit={openEditModal}
        onDelete={handleDelete}
        emptyStateIcon={Server as any}
        emptyStateMessage={searchQuery.trim() ? `No platforms found matching "${searchQuery}"` : "No platforms yet. Click 'Add Platform' to create your first platform."}
        tableLayout="auto"
      />

      {/* Create Modal */}
      <AddPlatformModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
        }}
        onSuccess={handlePlatformCreated}
      />

      {/* Edit Modal */}
      <AddPlatformModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPlatform(null)
        }}
        onSuccess={handlePlatformUpdated}
        editingPlatform={selectedPlatform}
      />
    </div>
  )
}

