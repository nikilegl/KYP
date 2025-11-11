import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Copy, FolderOpen } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { EditJourneyModal } from './EditJourneyModal'
import { ManageFoldersModal } from './ManageFoldersModal'
import { getProjects, getUserJourneys, deleteUserJourney, updateUserJourney, createUserJourney, type UserJourney } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import { getUserJourneyFolders, assignUserJourneysToFolder, type UserJourneyFolder } from '../lib/database/services/userJourneyFolderService'
import type { Project, LawFirm } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { convertEmojis } from '../utils/emojiConverter'
import * as emoji from 'node-emoji'

interface WorkspaceUserInfo {
  id: string
  email: string
  full_name?: string
}

interface UserJourneyWithProject extends UserJourney {
  project?: Project
  folder?: UserJourneyFolder
  lawFirms?: LawFirm[]
  createdByUser?: WorkspaceUserInfo
  updatedByUser?: WorkspaceUserInfo
  nodes_count?: number // Computed property for sorting
  law_firms_text?: string // Computed property for sorting law firms
}

interface UserJourneysManagerProps {
  projectId?: string // Optional - if provided, filters journeys to this project
}

export function UserJourneysManager({ projectId }: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [folders, setFolders] = useState<UserJourneyFolder[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [folderFilter, setFolderFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showManageFoldersModal, setShowManageFoldersModal] = useState(false)
  const [showAddToFolderModal, setShowAddToFolderModal] = useState(false)
  const [selectedFolderForAssignment, setSelectedFolderForAssignment] = useState<string>('')
  const [assigningToFolder, setAssigningToFolder] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [journeyToDelete, setJourneyToDelete] = useState<UserJourneyWithProject | null>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [journeyToDuplicate, setJourneyToDuplicate] = useState<UserJourneyWithProject | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [selectedJourneys, setSelectedJourneys] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [journeyToEdit, setJourneyToEdit] = useState<UserJourneyWithProject | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    layout: 'vertical' as 'vertical' | 'horizontal',
    status: 'draft' as 'draft' | 'published',
    project_id: ''
  })
  const [selectedLawFirmIds, setSelectedLawFirmIds] = useState<string[]>([])
  const [lawFirmSearchQuery, setLawFirmSearchQuery] = useState('')
  const [showAddLawFirmModal, setShowAddLawFirmModal] = useState(false)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)

  // Load projects and journeys on mount
  useEffect(() => {
    loadData()
  }, [])

  // Handle creating a new law firm from the Edit Journey Details modal
  const handleCreateLawFirmFromModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      // Get current user's workspace
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single()
          
          if (workspaceUser) {
            await createLawFirm(
              newLawFirm.name,
              newLawFirm.structure,
              newLawFirm.status
            )
            
            // Reload law firms
            const lawFirmsData = await getLawFirms({ workspaceId: workspaceUser.workspace_id })
            setLawFirms(lawFirmsData)
            
            // Reset form and close modal
            setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
            setShowAddLawFirmModal(false)
          }
        }
      }
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)

      // Load all folders
      const foldersData = await getUserJourneyFolders()
      setFolders(foldersData)

      // Load all law firms
      const lawFirmsData = await getLawFirms()
      setLawFirms(lawFirmsData)

      // Load all journeys (including those without projects)
      const allJourneys = await getUserJourneys()
      
      // Get unique user IDs from created_by and updated_by
      const userIds = new Set<string>()
      allJourneys.forEach(journey => {
        if (journey.created_by) userIds.add(journey.created_by)
        if (journey.updated_by) userIds.add(journey.updated_by)
      })
      
      console.log('📊 User Journey Tracking Debug:')
      console.log('- Total journeys:', allJourneys.length)
      console.log('- Journeys with created_by:', allJourneys.filter(j => j.created_by).length)
      console.log('- Journeys with updated_by:', allJourneys.filter(j => j.updated_by).length)
      console.log('- Unique user IDs:', Array.from(userIds))
      
      // Fetch user information if we have Supabase configured
      const usersMap = new Map<string, WorkspaceUserInfo>()
      if (supabase && userIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from('workspace_users')
          .select('user_id, full_name, user_email')
          .in('user_id', Array.from(userIds))
        
        console.log('- Fetched users:', users?.length || 0)
        if (usersError) console.error('- Error fetching users:', usersError)
        
        if (users) {
          users.forEach(user => {
            usersMap.set(user.user_id, {
              id: user.user_id,
              full_name: user.full_name,
              email: user.user_email
            })
          })
          console.log('- Users map size:', usersMap.size)
        }
      }
      
      // Enrich with project data, folder data, law firms, and user information
      const journeysWithData: UserJourneyWithProject[] = await Promise.all(
        allJourneys.map(async journey => {
          const project = journey.project_id 
            ? projectsData.find(p => p.id === journey.project_id)
            : undefined
          
          const folder = journey.folder_id 
            ? foldersData.find(f => f.id === journey.folder_id)
            : undefined
          
          // Get law firm IDs for this journey
          const lawFirmIds = await getUserJourneyLawFirms(journey.id)
          
          // Get full law firm objects
          const lawFirms = lawFirmsData.filter(firm => lawFirmIds.includes(firm.id))
          
          return {
            ...journey,
            project,
            folder,
            lawFirms,
            createdByUser: journey.created_by ? usersMap.get(journey.created_by) : undefined,
            updatedByUser: journey.updated_by ? usersMap.get(journey.updated_by) : undefined,
            nodes_count: journey.flow_data?.nodes?.length || 0, // Computed property for sorting
            law_firms_text: lawFirms.map(firm => firm.name).join(', ') || '' // Computed property for sorting law firms
          }
        })
      )
      
      setUserJourneys(journeysWithData)
    } catch (error) {
      console.error('Error loading user journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter user journeys based on search term, project, and folder
  const filteredUserJourneys = userJourneys.filter(journey => {
    // Apply project filter (if projectId prop is provided, it takes precedence)
    let matchesProject = true
    if (projectId) {
      matchesProject = journey.project_id === projectId
    } else {
      matchesProject = projectFilter === 'all' || 
                      (projectFilter === 'none' && !journey.project_id) ||
                      journey.project_id === projectFilter
    }
    
    // Apply folder filter
    const matchesFolder = folderFilter === 'all' || 
                        (folderFilter === 'none' && !journey.folder_id) ||
                        journey.folder_id === folderFilter
    
    // If no search term, just apply filters
    if (!searchTerm) {
      return matchesProject && matchesFolder
    }
    
    // Convert search term emojis (e.g., :gear: becomes ⚙️)
    const searchWithEmojis = emoji.emojify(searchTerm)
    const searchLower = searchWithEmojis.toLowerCase()
    
    // Search in name and description
    // Journey names/descriptions may already have emojis, so this will match both
    // - Typing "gear" will match "Settings" 
    // - Typing ":gear:" will become "⚙️" and match "⚙️ Settings"
    // - Typing "⚙" or "⚙️" will also match "⚙️ Settings"
    const matchesSearch = journey.name.toLowerCase().includes(searchLower) ||
                         (journey.description && journey.description.toLowerCase().includes(searchLower))
    
    return matchesSearch && matchesProject && matchesFolder
  })

  // Handle edit
  const handleEditClick = (journey: UserJourneyWithProject) => {
    setJourneyToEdit(journey)
    setEditForm({
      name: journey.name,
      description: journey.description || '',
      layout: journey.layout || 'vertical',
      status: journey.status || 'draft',
      project_id: journey.project_id || ''
    })
    // Set selected law firms
    setSelectedLawFirmIds(journey.lawFirms?.map(firm => firm.id) || [])
    setLawFirmSearchQuery('')
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!journeyToEdit || !editForm.name.trim()) return
    
    try {
      await updateUserJourney(journeyToEdit.id, {
        name: editForm.name,
        description: editForm.description,
        layout: editForm.layout,
        status: editForm.status,
        project_id: editForm.project_id || null
      })
      
      // Save law firm associations
      await setUserJourneyLawFirms(journeyToEdit.id, selectedLawFirmIds)
      
      // Get updated law firms for local state
      const updatedLawFirms = lawFirms.filter(firm => selectedLawFirmIds.includes(firm.id))
      
      // Update local state
      setUserJourneys(prev => prev.map(j => 
        j.id === journeyToEdit.id 
          ? { 
              ...j, 
              name: editForm.name, 
              description: editForm.description,
              layout: editForm.layout,
              status: editForm.status,
              project_id: editForm.project_id || null,
              project: editForm.project_id ? projects.find(p => p.id === editForm.project_id) : undefined,
              lawFirms: updatedLawFirms
            }
          : j
      ))
      
      setShowEditModal(false)
      setJourneyToEdit(null)
      setSelectedLawFirmIds([])
      setLawFirmSearchQuery('')
    } catch (error) {
      console.error('Error updating journey:', error)
      alert('Failed to update journey')
    }
  }

  // Handle delete
  const handleDeleteClick = (journey: UserJourneyWithProject) => {
    setJourneyToDelete(journey)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!journeyToDelete) return
    
    const success = await deleteUserJourney(journeyToDelete.id)
    if (success) {
      setUserJourneys(prev => prev.filter(j => j.id !== journeyToDelete.id))
      setShowDeleteConfirm(false)
      setJourneyToDelete(null)
    } else {
      alert('Failed to delete journey')
    }
  }

  // Handle duplicate
  const handleDuplicateClick = (journey: UserJourneyWithProject) => {
    setJourneyToDuplicate(journey)
    setShowDuplicateConfirm(true)
  }

  const confirmDuplicate = async () => {
    if (!journeyToDuplicate) return
    
    try {
      setDuplicating(true)
      
      // Create a copy with a new name
      const duplicateName = `${journeyToDuplicate.name} (Copy)`
      
      const duplicated = await createUserJourney(
        duplicateName,
        journeyToDuplicate.description || '',
        journeyToDuplicate.flow_data || { nodes: [], edges: [] },
        journeyToDuplicate.project_id || null,
        journeyToDuplicate.layout || 'vertical'
      )
      
      if (duplicated) {
        // Copy law firm associations
        const lawFirmIds = journeyToDuplicate.lawFirms?.map(firm => firm.id) || []
        await setUserJourneyLawFirms(duplicated.id, lawFirmIds)
        
        // Reload data to show the new journey
        await loadData()
        
        setShowDuplicateConfirm(false)
        setJourneyToDuplicate(null)
      } else {
        alert('Failed to duplicate journey')
      }
    } catch (error) {
      console.error('Error duplicating journey:', error)
      alert('Failed to duplicate journey')
    } finally {
      setDuplicating(false)
    }
  }

  // Navigate to user journey creator
  const handleCreateUserJourney = () => {
    if (projectId) {
      navigate(`/user-journey-creator?projectId=${projectId}`)
    } else {
      navigate('/user-journey-creator')
    }
  }

  // Handle adding selected journeys to a folder
  const handleAddToFolderClick = () => {
    if (selectedJourneys.length === 0) return
    setSelectedFolderForAssignment('')
    setShowAddToFolderModal(true)
  }

  const handleAssignToFolder = async () => {
    if (selectedJourneys.length === 0) return

    setAssigningToFolder(true)
    try {
      // Allow assigning to null to remove from folder
      const folderId = selectedFolderForAssignment === 'none' ? null : selectedFolderForAssignment
      await assignUserJourneysToFolder(selectedJourneys, folderId)
      await loadData()
      setSelectedJourneys([])
      setShowAddToFolderModal(false)
      setSelectedFolderForAssignment('')
    } catch (error) {
      console.error('Error assigning journeys to folder:', error)
      alert('Failed to assign journeys to folder. Please try again.')
    } finally {
      setAssigningToFolder(false)
    }
  }

  // Table columns configuration
  const columns: Column<UserJourneyWithProject>[] = [
    {
      key: 'name',
      header: 'User Journey Name',
      sortable: true,
      width: '400px',
      render: (journey) => (
        <div className="break-words whitespace-normal">
          {journey.folder && (
            <div className="text-xs mb-1 flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: journey.folder.color }}
              />
              <span className="text-gray-600">{journey.folder.name}</span>
            </div>
          )}
          <div className="font-medium text-gray-900">{convertEmojis(journey.name)}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (journey) => {
        const status = journey.status || 'draft'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
        )
      }
    },
    {
      key: 'nodes_count',
      header: 'Nodes',
      sortable: true,
      width: '80px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {journey.flow_data?.nodes?.length || 0}
        </div>
      )
    },
    {
      key: 'law_firms_text',
      header: 'Law Firms',
      sortable: true,
      width: '250px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {journey.lawFirms && journey.lawFirms.length > 0 
            ? journey.lawFirms.map(firm => firm.name).join(', ')
            : '—'
          }
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      width: '180px',
      render: (journey) => {
        const createdDate = new Date(journey.created_at)
        const formattedDate = createdDate.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: '2-digit' 
        })
        const formattedTime = createdDate.toLocaleTimeString('en-GB', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }).toLowerCase()
        
        return (
          <div className="break-words whitespace-normal">
            <div className="text-xs text-gray-500 mb-1">
              {formattedDate}, {formattedTime}
            </div>
            {journey.createdByUser && (
              <div className="font-medium text-gray-900">
                {journey.createdByUser.full_name || 'Unknown User'}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      sortable: true,
      width: '180px',
      render: (journey) => {
        const updatedDate = new Date(journey.updated_at)
        const formattedDate = updatedDate.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: '2-digit' 
        })
        const formattedTime = updatedDate.toLocaleTimeString('en-GB', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }).toLowerCase()
        
        return (
          <div className="break-words whitespace-normal">
            <div className="text-xs text-gray-500 mb-1">
              {formattedDate}, {formattedTime}
            </div>
            {journey.updatedByUser && (
              <div className="font-medium text-gray-900">
                {journey.updatedByUser.full_name || 'Unknown User'}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '150px',
      render: (journey) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditClick(journey)
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Edit journey details"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDuplicateClick(journey)
            }}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Duplicate journey"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(journey)
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Delete journey"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <LoadingState message="Loading user journeys..." size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={projectId ? "flex-1 flex flex-col overflow-auto" : "flex-1 flex flex-col p-6 overflow-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Visual flow diagrams showing user interactions and processes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowManageFoldersModal(true)}
            className="flex items-center gap-2"
          >
            <FolderOpen size={20} />
            Edit Folders
          </Button>
          <Button
            onClick={handleCreateUserJourney}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Create User Journey
          </Button>
        </div>
      </div>

  

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search user journeys (supports emojis: :gear:)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Folder filter */}
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Folders</option>
          <option value="none">No Folder</option>
          {folders.map(folder => (
            <option key={folder.id} value={folder.id}>{folder.name}</option>
          ))}
        </select>
        
        {/* Only show Epic filter if not filtering by project */}
        {!projectId && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Epics</option>
            <option value="none">No Epic</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk Actions - Show when items are selected */}
      {selectedJourneys.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-900 font-medium">
            {selectedJourneys.length} user journey{selectedJourneys.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddToFolderClick}
              className="flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Add to Folder
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedJourneys([])}
              className="text-sm"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* User Journeys Table */}
      <div className="flex-shrink-0">
        <DataTable
          data={filteredUserJourneys}
          getItemId={(journey) => journey.id}
          columns={columns}
          sortableFields={['name', 'status', 'nodes_count', 'law_firms_text', 'created_at', 'updated_at']}
          onRowClick={(journey) => navigate(`/user-journey/${journey.short_id}`)}
          selectable={true}
          selectedItems={selectedJourneys}
          onSelectionChange={setSelectedJourneys}
          showSelectionBar={false}
        />
      </div>




      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && journeyToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setJourneyToDelete(null)
          }}
          title="Delete User Journey"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setJourneyToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Journey
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to delete "<strong>{journeyToDelete.name}</strong>"? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && journeyToDuplicate && (
        <Modal
          isOpen={showDuplicateConfirm}
          onClose={() => {
            setShowDuplicateConfirm(false)
            setJourneyToDuplicate(null)
          }}
          title="Duplicate User Journey"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDuplicateConfirm(false)
                  setJourneyToDuplicate(null)
                }}
                disabled={duplicating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDuplicate}
                disabled={duplicating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {duplicating ? 'Duplicating...' : 'Confirm'}
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to duplicate this user journey? A copy will be created with the name "<strong>{journeyToDuplicate.name} (Copy)</strong>".
            </p>
          </div>
        </Modal>
      )}

      {/* Edit Journey Modal */}
      {showEditModal && journeyToEdit && (
        <EditJourneyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setJourneyToEdit(null)
            setSelectedLawFirmIds([])
            setLawFirmSearchQuery('')
          }}
          onSave={saveEdit}
          journeyName={editForm.name}
          journeyDescription={editForm.description}
          journeyLayout={editForm.layout}
          journeyStatus={editForm.status}
          selectedProjectId={editForm.project_id}
          selectedLawFirmIds={selectedLawFirmIds}
          lawFirmSearchQuery={lawFirmSearchQuery}
          projects={projects}
          lawFirms={lawFirms}
          onNameChange={(name) => setEditForm(prev => ({ ...prev, name }))}
          onDescriptionChange={(description) => setEditForm(prev => ({ ...prev, description }))}
          onLayoutChange={(layout) => setEditForm(prev => ({ ...prev, layout }))}
          onStatusChange={(status) => setEditForm(prev => ({ ...prev, status }))}
          onProjectChange={(project_id) => setEditForm(prev => ({ ...prev, project_id }))}
          onLawFirmSearchChange={setLawFirmSearchQuery}
          onLawFirmToggle={(firmId, checked) => {
            if (checked) {
              setSelectedLawFirmIds(prev => [...prev, firmId])
            } else {
              setSelectedLawFirmIds(prev => prev.filter(id => id !== firmId))
            }
          }}
          onAddLawFirmClick={() => setShowAddLawFirmModal(true)}
        />
      )}

      {/* Add Law Firm Modal - Opens from Edit Journey Details when no search results */}
      <LawFirmForm
        isOpen={showAddLawFirmModal}
        isEditing={false}
        lawFirm={newLawFirm}
        loading={creatingLawFirm}
        onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
        onSubmit={handleCreateLawFirmFromModal}
        onClose={() => {
          setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
          setShowAddLawFirmModal(false)
        }}
      />

      {/* Manage Folders Modal */}
      <ManageFoldersModal
        isOpen={showManageFoldersModal}
        onClose={() => setShowManageFoldersModal(false)}
        onFoldersChanged={loadData}
      />

      {/* Add to Folder Modal */}
      <Modal
        isOpen={showAddToFolderModal}
        onClose={() => setShowAddToFolderModal(false)}
        title="Add to Folder"
        size="sm"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAddToFolderModal(false)}
              disabled={assigningToFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignToFolder}
              disabled={!selectedFolderForAssignment || assigningToFolder}
              loading={assigningToFolder}
            >
              Assign to Folder
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Assign <strong>{selectedJourneys.length}</strong> selected user journey{selectedJourneys.length > 1 ? 's' : ''} to a folder:
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder
            </label>
            <select
              value={selectedFolderForAssignment}
              onChange={(e) => setSelectedFolderForAssignment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            >
              <option value="">Choose a folder...</option>
              <option value="none">Remove from folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          {folders.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No folders available. Create a folder first using the "Edit Folders" button.
            </p>
          )}
        </div>
      </Modal>

    </div>
  )
}
