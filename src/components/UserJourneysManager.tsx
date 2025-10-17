import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { getProjects, getUserJourneys, deleteUserJourney, updateUserJourney, type UserJourney } from '../lib/database'
import type { Project } from '../lib/supabase'

interface UserJourneyWithProject extends UserJourney {
  project?: Project
}

interface UserJourneysManagerProps {
  projectId?: string // Optional - if provided, filters journeys to this project
}

export function UserJourneysManager({ projectId }: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [journeyToDelete, setJourneyToDelete] = useState<UserJourneyWithProject | null>(null)
  const [selectedJourneys, setSelectedJourneys] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [journeyToEdit, setJourneyToEdit] = useState<UserJourneyWithProject | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    project_id: ''
  })

  // Load projects and journeys on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)

      // Load all journeys (including those without projects)
      const allJourneys = await getUserJourneys()
      
      // Enrich with project data
      const journeysWithProject: UserJourneyWithProject[] = allJourneys.map(journey => {
        const project = journey.project_id 
          ? projectsData.find(p => p.id === journey.project_id)
          : undefined
        return {
          ...journey,
          project
        }
      })
      
      setUserJourneys(journeysWithProject)
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
      project_id: journey.project_id || ''
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!journeyToEdit || !editForm.name.trim()) return
    
    try {
      await updateUserJourney(journeyToEdit.id, {
        name: editForm.name,
        description: editForm.description,
        project_id: editForm.project_id || null
      })
      
      // Update local state
      setUserJourneys(prev => prev.map(j => 
        j.id === journeyToEdit.id 
          ? { 
              ...j, 
              name: editForm.name, 
              description: editForm.description,
              project_id: editForm.project_id || null,
              project: editForm.project_id ? projects.find(p => p.id === editForm.project_id) : undefined
            }
          : j
      ))
      
      setShowEditModal(false)
      setJourneyToEdit(null)
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
          {journey.project?.name || (journey.project_id ? 'Unknown Epic' : 'Standalone')}
        </span>
      )
    }] : []),
    {
      key: 'name',
      header: 'User Journey Name',
      sortable: true,
      width: '300px',
      render: (journey) => (
        <div className="font-medium text-gray-900">{journey.name}</div>
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
      key: 'edges_count',
      header: 'Edges',
      sortable: false,
      width: '80px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {journey.flow_data?.edges?.length || 0}
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
      width: '120px',
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
    <div className={projectId ? "space-y-6" : "space-y-6 p-6"}>
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <div className="flex items-center gap-4">
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
            <option value="none">Standalone (No Epic)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* User Journeys Table */}

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

      {/* Edit Journey Modal */}
      {showEditModal && journeyToEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setJourneyToEdit(null)
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
          </div>
        </Modal>
      )}

    </div>
  )
}
