import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Route, Edit, Trash2, FolderOpen } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { getProjects, getUserJourneys, deleteUserJourney, type UserJourney } from '../lib/database'
import type { Project } from '../lib/supabase'

interface UserJourneyWithProject extends UserJourney {
  project?: Project
}

interface UserJourneysManagerProps {
  // Props will be added as needed
}

export function UserJourneysManager({}: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [journeyToDelete, setJourneyToDelete] = useState<UserJourneyWithProject | null>(null)

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
    const matchesProject = projectFilter === 'all' || 
                          (projectFilter === 'none' && !journey.project_id) ||
                          journey.project_id === projectFilter
    return matchesSearch && matchesProject
  })

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
    navigate('/user-journey-creator')
  }

  // Table columns configuration
  const columns: Column<UserJourneyWithProject>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      width: '300px',
      render: (journey) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Route size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{journey.name}</div>
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {journey.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'project',
      header: 'Project',
      sortable: true,
      width: '200px',
      render: (journey) => (
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-gray-400" />
          <span className="text-sm text-gray-700">
            {journey.project?.name || (journey.project_id ? 'Unknown Project' : 'Standalone')}
          </span>
        </div>
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
            onClick={() => navigate(`/user-journey-creator?id=${journey.id}`)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Edit journey"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(journey)}
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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Projects</option>
          <option value="none">Standalone (No Project)</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      {/* User Journeys Table */}

        <DataTable
          data={filteredUserJourneys}
          getItemId={(journey) => journey.id}
          columns={columns}
          className="min-w-0"
        />


      {/* Empty State */}
      {filteredUserJourneys.length === 0 && (
        <div className="text-center py-12">
          <Route size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || projectFilter !== 'all' ? 'No matching user journeys' : 'No user journeys yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || projectFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first user journey'
            }
          </p>
          {(!searchTerm && projectFilter === 'all') && (
            <Button
              onClick={handleCreateUserJourney}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Create User Journey
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && journeyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete User Journey</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{journeyToDelete.name}</strong>"? This action cannot be undone.
            </p>
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
          </div>
        </div>
      )}

    </div>
  )
}
