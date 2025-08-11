import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Loader2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { getProjectStakeholders } from '../lib/database'
import { PROGRESS_QUESTIONS } from '../lib/database'
import { getUserProjectPreferences, updateProjectOrder } from '../lib/database/services/userProjectPreferenceService'
import { ProjectCard } from './ProjectCard'
import { useAuth } from '../hooks/useAuth'
import type { Project, ProjectProgressStatus, UserStory, UserJourney, Design, Stakeholder, ResearchNote, ProblemOverview, UserProjectPreference } from '../lib/supabase'

interface ProjectManagerProps {
  projects: Project[]
  stakeholders?: Stakeholder[]
  notes?: ResearchNote[]
  problemOverviews?: ProblemOverview[]
  allProjectProgressStatus?: ProjectProgressStatus[]
  allUserStories?: UserStory[]
  allUserJourneys?: UserJourney[]
  allDesigns?: Design[]
  onCreateProject: (name: string, overview?: string) => Promise<void>
  onSelectProject: (project: Project) => void
  onUpdateProject?: (projectId: string, updates: { name?: string; overview?: string }) => Promise<void>
  onDeleteProject?: (projectId: string) => Promise<void>
}

export function ProjectManager({ 
  projects, 
  stakeholders = [], 
  notes = [], 
  problemOverviews = [],
  allProjectProgressStatus = [],
  allUserStories = [],
  allUserJourneys = [],
  allDesigns = [],
  onCreateProject, 
  onSelectProject,
  onUpdateProject,
  onDeleteProject
}: ProjectManagerProps) {
  const { user } = useAuth()
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState({ name: '', overview: '' })
  const [creatingProject, setCreatingProject] = useState(false)
  const [updatingProject, setUpdatingProject] = useState(false)
  const [orderedProjects, setOrderedProjects] = useState<Project[]>(projects)
  const [userPreferences, setUserPreferences] = useState<UserProjectPreference[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedProject, setDraggedProject] = useState<Project | null>(null)

  // State for stakeholder counts
  const [stakeholderCounts, setStakeholderCounts] = useState<Record<string, number>>({})

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load user preferences and order projects accordingly
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return
      
      try {
        const preferences = await getUserProjectPreferences(user.id)
        setUserPreferences(preferences)
        
        // Create a map for quick lookup
        const preferenceMap = new Map(preferences.map(p => [p.project_id, p.order_index]))
        
        // Sort projects based on user preferences, with unordered projects at the end
        const sortedProjects = [...projects].sort((a, b) => {
          const aOrder = preferenceMap.get(a.id) ?? 999999
          const bOrder = preferenceMap.get(b.id) ?? 999999
          
          if (aOrder === bOrder) {
            // If both have no preference or same preference, sort by creation date
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          
          return aOrder - bOrder
        })
        
        setOrderedProjects(sortedProjects)
      } catch (error) {
        console.error('Error loading user preferences:', error)
        setOrderedProjects(projects)
      }
    }
    
    loadUserPreferences()
  }, [projects, user])

  // Load stakeholder counts when projects change
  useEffect(() => {
    const loadStakeholderCounts = async () => {
      const counts: Record<string, number> = {}
      for (const project of projects) {
        counts[project.id] = await getProjectStakeholderCount(project.id)
      }
      setStakeholderCounts(counts)
    }
    
    if (projects.length > 0) {
      loadStakeholderCounts()
    }
  }, [projects])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingProject(true)
    
    try {
      await onCreateProject(newProject.name, newProject.overview || undefined)
      setNewProject({ name: '', overview: '' })
      setShowProjectForm(false)
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !onUpdateProject) return
    
    setUpdatingProject(true)
    
    try {
      await onUpdateProject(editingProject.id, {
        name: editingProject.name,
        overview: editingProject.overview
      })
      setEditingProject(null)
    } catch (error) {
      console.error('Error updating project:', error)
    } finally {
      setUpdatingProject(false)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!onDeleteProject) return
    
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        await onDeleteProject(projectId)
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  const getProjectStakeholderCount = async (projectId: string) => {
    try {
      const stakeholderIds = await getProjectStakeholders(projectId)
      return stakeholderIds.length
    } catch (error) {
      console.error('Error getting project stakeholder count:', error)
      return 0
    }
  }

  // Remove these functions as they're now in ProjectCard

  const handleProjectClick = (project: Project) => {
    onSelectProject(project)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    const project = orderedProjects.find(p => p.id === active.id)
    setDraggedProject(project || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedProject(null)
    
    if (!over || !user) return
    
    const activeId = active.id as string
    const overId = over.id as string
    
    if (activeId !== overId) {
      const oldIndex = orderedProjects.findIndex(p => p.id === activeId)
      const newIndex = orderedProjects.findIndex(p => p.id === overId)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const newOrderedProjects = arrayMove(orderedProjects, oldIndex, newIndex)
        
        // Apply optimistic update
        setOrderedProjects(newOrderedProjects)
        
        // Prepare order data for database
        const orderData = newOrderedProjects.map((project, index) => ({
          project_id: project.id,
          order_index: index + 1
        }))
        
        try {
          // Save to database
          await updateProjectOrder(user.id, orderData)
          
          // Reload preferences to ensure consistency
          const updatedPreferences = await getUserProjectPreferences(user.id)
          setUserPreferences(updatedPreferences)
        } catch (error) {
          console.error('Error updating project order:', error)
          // Revert optimistic update on error
          setOrderedProjects(orderedProjects)
        }
      }
    }
  }
  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage your design and research projects</p>
        </div>
        <button
          onClick={() => setShowProjectForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Create Project Form */}
      {showProjectForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={creatingProject}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overview (Optional)</label>
              <textarea
                value={newProject.overview}
                onChange={(e) => setNewProject({ ...newProject, overview: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={creatingProject}
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={creatingProject}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {creatingProject && <Loader2 size={16} className="animate-spin" />}
                Create Project
              </button>
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={creatingProject}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Project Form */}
      {editingProject && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Project</h3>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={editingProject.name}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={updatingProject}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overview (Optional)</label>
              <textarea
                value={editingProject.overview || ''}
                onChange={(e) => setEditingProject({ ...editingProject, overview: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={updatingProject}
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={updatingProject}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {updatingProject && <Loader2 size={16} className="animate-spin" />}
                Update Project
              </button>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={updatingProject}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid with Drag and Drop */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={orderedProjects.map(p => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stakeholders={stakeholders}
                notes={notes}
                problemOverviews={problemOverviews}
                allProjectProgressStatus={allProjectProgressStatus}
                allUserStories={allUserStories}
                allUserJourneys={allUserJourneys}
                allDesigns={allDesigns}
                onSelect={handleProjectClick}
                onEdit={setEditingProject}
                onDelete={handleDeleteProject}
              />
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No projects yet. Create your first project to get started!</p>
              </div>
            )}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId && draggedProject ? (
            <ProjectCard
              project={draggedProject}
              stakeholders={stakeholders}
              notes={notes}
              problemOverviews={problemOverviews}
              allProjectProgressStatus={allProjectProgressStatus}
              allUserStories={allUserStories}
              allUserJourneys={allUserJourneys}
              allDesigns={allDesigns}
              onSelect={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}