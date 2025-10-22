import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Copy } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { getProjects, getUserJourneys, deleteUserJourney, updateUserJourney, createUserJourney, type UserJourney } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import type { Project, LawFirm } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { convertEmojis } from '../utils/emojiConverter'

interface UserJourneyWithProject extends UserJourney {
  project?: Project
  lawFirms?: LawFirm[]
}

interface UserJourneysManagerProps {
  projectId?: string // Optional - if provided, filters journeys to this project
}

export function UserJourneysManager({ projectId }: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
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

      // Load all law firms
      const lawFirmsData = await getLawFirms()
      setLawFirms(lawFirmsData)

      // Load all journeys (including those without projects)
      const allJourneys = await getUserJourneys()
      
      // Enrich with project data and law firms
      const journeysWithData: UserJourneyWithProject[] = await Promise.all(
        allJourneys.map(async journey => {
          const project = journey.project_id 
            ? projectsData.find(p => p.id === journey.project_id)
            : undefined
          
          // Get law firm IDs for this journey
          const lawFirmIds = await getUserJourneyLawFirms(journey.id)
          
          // Get full law firm objects
          const lawFirms = lawFirmsData.filter(firm => lawFirmIds.includes(firm.id))
          
          return {
            ...journey,
            project,
            lawFirms
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

  // Filter user journeys based on search term and project
  const filteredUserJourneys = userJourneys.filter(journey => {
    const matchesSearch = journey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (journey.description && journey.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // If projectId prop is provided, only show journeys for that project
    if (projectId) {
      return matchesSearch && journey.project_id === projectId
    }
    
    // Otherwise use the project filter
    const matchesProject = projectFilter === 'all' || 
                          (projectFilter === 'none' && !journey.project_id) ||
                          journey.project_id === projectFilter
    return matchesSearch && matchesProject
  })

  // Handle edit
  const handleEditClick = (journey: UserJourneyWithProject) => {
    setJourneyToEdit(journey)
    setEditForm({
      name: journey.name,
      description: journey.description || '',
      layout: journey.layout || 'vertical',
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

  // Table columns configuration
  const columns: Column<UserJourneyWithProject>[] = [
    // Only show Epic column if not filtering by project
    ...(!projectId ? [{
      key: 'project',
      header: 'Epic',
      sortable: true,
      width: '200px',
      render: (journey: UserJourneyWithProject) => (
        <span className="font-medium text-gray-900">
          {convertEmojis(journey.project?.name || (journey.project_id ? 'Unknown Epic' : '-'))}
        </span>
      )
    }] : []),
    {
      key: 'name',
      header: 'User Journey Name',
      sortable: true,
      width: '300px',
      render: (journey) => (
        <div className="font-medium text-gray-900 break-words whitespace-normal">{convertEmojis(journey.name)}</div>
      )
    },
    {
      key: 'nodes_count',
      header: 'Nodes',
      sortable: false,
      width: '80px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {journey.flow_data?.nodes?.length || 0}
        </div>
      )
    },
    {
      key: 'law_firms',
      header: 'Law Firms',
      sortable: false,
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
      width: '120px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {new Date(journey.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      sortable: true,
      width: '120px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {new Date(journey.updated_at).toLocaleDateString()}
        </div>
      )
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user journeys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={projectId ? "flex-1 flex flex-col space-y-6 overflow-auto" : "flex-1 flex flex-col space-y-6 p-6 overflow-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Visual flow diagrams showing user interactions and processes</p>
        </div>
        <Button
          onClick={handleCreateUserJourney}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Create User Journey
        </Button>
      </div>

  

      {/* Filters */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search user journeys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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

      {/* User Journeys Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <DataTable
          data={filteredUserJourneys}
          getItemId={(journey) => journey.id}
          columns={columns}
          onRowClick={(journey) => navigate(`/user-journey-creator?id=${journey.id}`)}
          selectable={true}
          selectedItems={selectedJourneys}
          onSelectionChange={setSelectedJourneys}
          className="min-w-0"
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
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setJourneyToEdit(null)
            setSelectedLawFirmIds([])
            setLawFirmSearchQuery('')
          }}
          title="Edit Journey Details"
          size="md"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false)
                  setJourneyToEdit(null)
                  setSelectedLawFirmIds([])
                  setLawFirmSearchQuery('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveEdit}
                disabled={!editForm.name.trim()}
              >
                Save Details
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Journey Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter journey name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout
              </label>
              <select
                value={editForm.layout}
                onChange={(e) => setEditForm(prev => ({ ...prev, layout: e.target.value as 'vertical' | 'horizontal' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="vertical">Vertical (Top to Bottom)</option>
                <option value="horizontal">Horizontal (Left to Right)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Epic
              </label>
              <select
                value={editForm.project_id}
                onChange={(e) => setEditForm(prev => ({ ...prev, project_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Epic</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Law Firms
              </label>
              <input
                type="text"
                value={lawFirmSearchQuery}
                onChange={(e) => setLawFirmSearchQuery(e.target.value)}
                placeholder="Search law firms..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              />
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {lawFirms
                  .filter(firm => 
                    lawFirmSearchQuery.trim() === '' || 
                    firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
                  )
                  .map(firm => (
                    <label
                      key={firm.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLawFirmIds.includes(firm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLawFirmIds(prev => [...prev, firm.id])
                          } else {
                            setSelectedLawFirmIds(prev => prev.filter(id => id !== firm.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{firm.name}</span>
                    </label>
                  ))}
                {lawFirms.filter(firm => 
                  lawFirmSearchQuery.trim() === '' || 
                  firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">No law firms found</p>
                    <Button
                      variant="outline"
                      size="small"
                      icon={Plus}
                      onClick={() => {
                        setShowAddLawFirmModal(true)
                      }}
                    >
                      Add Law Firm
                    </Button>
                  </div>
                )}
              </div>
              {selectedLawFirmIds.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedLawFirmIds.length} law firm{selectedLawFirmIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
        </Modal>
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

    </div>
  )
}
