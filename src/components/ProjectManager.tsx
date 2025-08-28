import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Loader2, Edit, Trash2, FileText, BookOpen, GitBranch, Palette, GripVertical } from 'lucide-react'
import { getProjectStakeholders } from '../lib/database/services/projectService'
import type { Project, ProjectProgressStatus, UserStory, UserJourney, Design, Stakeholder, ResearchNote, ProblemOverview } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { 
  useSortable 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  getUserProjectPreferences, 
  reorderProjects, 
  initializeProjectPreferences,
  removeProjectPreference,
  type ProjectWithOrder 
} from '../lib/database/services/userProjectPreferenceService'
import { supabase } from '../lib/supabase'

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
  onUpdateProject?: (project: Project) => Promise<void>
  onDeleteProject?: (projectId: string) => Promise<void>
}

// Sortable Project Card Component
interface SortableProjectCardProps {
  project: Project
  projectNotes: ResearchNote[]
  projectProblemOverview?: ProblemOverview
  projectProgressStatuses: ProjectProgressStatus[]
  projectUserStories: UserStory[]
  projectUserJourneys: UserJourney[]
  projectDesigns: Design[]
  stakeholderCount: number
  onProjectClick: (project: Project) => void
  onProjectEdit: (project: Project) => void
  onProjectDelete: (projectId: string, projectName: string) => void
  isDragOverlay?: boolean
}

function SortableProjectCard({
  project,
  projectNotes,
  projectProblemOverview,
  projectProgressStatuses,
  projectUserStories,
  projectUserJourneys,
  projectDesigns,
  stakeholderCount,
  onProjectClick,
  onProjectEdit,
  onProjectDelete,
  isDragOverlay = false
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Calculate progress percentage
  const totalProgressItems = projectProgressStatuses.length
  const completedProgressItems = projectProgressStatuses.filter(ps => ps.is_completed).length
  const progressPercentage = totalProgressItems > 0 ? Math.round((completedProgressItems / totalProgressItems) * 100) : 0

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all relative group cursor-pointer"
      onClick={() => onProjectClick(project)}
    >
      {/* Project Header with Drag Handle */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
           {/* Drag Handle - positioned on the left side */}
      {!isDragOverlay && (
        <div
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors bg-white rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>
      )}
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
          </div>
        </div>
      </div>

     

      {/* Edit/Delete buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onProjectEdit(project)
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-blue-50 rounded transition-all"
          title="Edit project"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onProjectDelete(project.id, project.name)
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
          title="Delete project"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {/* Project Stats List */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <FileText size={14} className="text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">Research Notes ({projectNotes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <BookOpen size={14} className="text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">User Stories ({projectUserStories.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <GitBranch size={14} className="text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">User Journeys ({projectUserJourneys.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <Palette size={14} className="text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">Designs ({projectDesigns.length})</span>
        </div>
      </div>
      
      {/* Project Progress Bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Project Progress</span>
        <span className="text-sm font-medium text-gray-900">{progressPercentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  )
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
  const [orderedProjects, setOrderedProjects] = useState<Project[]>([])
  const [isReordering, setIsReordering] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedProject, setDraggedProject] = useState<Project | null>(null)
  const [hasInitializedPreferences, setHasInitializedPreferences] = useState(false)

  // State for stakeholder counts
  const [stakeholderCounts, setStakeholderCounts] = useState<Record<string, number>>({})

  // Configure sensors for drag and drop - same as UserStoriesSection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Load stakeholder counts when projects change
  useEffect(() => {
    const loadStakeholderCounts = async () => {
      const counts: Record<string, number> = {}
      for (const project of projects) {
        const stakeholderIds = await getProjectStakeholders(project.id)
        counts[project.id] = stakeholderIds.length
      }
      setStakeholderCounts(counts)
    }
    
    if (projects.length > 0) {
      loadStakeholderCounts()
    }
  }, [projects])

  // Load and initialize project preferences - only when projects actually change
  useEffect(() => {
    if (!user?.id || projects.length === 0 || hasInitializedPreferences) return

    const loadProjectPreferences = async () => {
      try {
        // Try to get existing preferences
        const preferences = await getUserProjectPreferences(user.id)
        
        if (preferences.length > 0) {
          // Use existing preferences to order projects
          const ordered = preferences.map(pref => 
            projects.find(p => p.id === pref.project_id)
          ).filter(Boolean) as Project[]
          
          // Add any new projects that don't have preferences yet
          const existingProjectIds = new Set(preferences.map(p => p.project_id))
          const newProjects = projects.filter(p => !existingProjectIds.has(p.id))
          
          setOrderedProjects([...ordered, ...newProjects])
        } else {
          // Initialize preferences with current project order
          await initializeProjectPreferences(user.id, projects.map(p => p.id))
          setOrderedProjects([...projects])
        }
        setHasInitializedPreferences(true)
      } catch (error) {
        console.error('Error loading project preferences:', error)
        // Fallback to original order
        setOrderedProjects([...projects])
        setHasInitializedPreferences(true)
      }
    }

    loadProjectPreferences()
  }, [user?.id, projects, hasInitializedPreferences])

  // Update orderedProjects when projects change (but only if we haven't initialized preferences yet)
  useEffect(() => {
    if (!hasInitializedPreferences && projects.length > 0) {
      setOrderedProjects([...projects])
    }
  }, [projects, hasInitializedPreferences])

  // Function to refresh project preferences (called when projects are added/removed)
  const refreshProjectPreferences = async () => {
    if (!user?.id) return
    
    try {
      setHasInitializedPreferences(false) // Reset flag to reload preferences
    } catch (error) {
      console.error('Error refreshing project preferences:', error)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingProject(true)
    
    try {
      await onCreateProject(newProject.name, newProject.overview || undefined)
      setNewProject({ name: '', overview: '' })
      setShowProjectForm(false)
      // Refresh preferences to include the new project
      await refreshProjectPreferences()
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
      await onUpdateProject(editingProject)
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
        // Remove from user preferences first
        if (user?.id) {
          await removeProjectPreference(user.id, projectId)
        }
        
        await onDeleteProject(projectId)
        // Refresh preferences after deletion
        await refreshProjectPreferences()
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }



  const handleProjectClick = (project: Project) => {
    onSelectProject(project)
  }

  const handleProjectEdit = (project: Project) => {
    setEditingProject(project)
    setNewProject({ name: project.name, overview: project.overview || '' })
    setShowProjectForm(true)
  }

  const handleProjectDelete = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      if (onDeleteProject) {
        await handleDeleteProject(projectId, projectName)
      }
    }
  }

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

    if (active.id !== over?.id) {
      setIsReordering(true)
      
      try {
        const oldIndex = orderedProjects.findIndex(p => p.id === active.id)
        const newIndex = orderedProjects.findIndex(p => p.id === over?.id)
        
        console.log('🔄 Reordering projects:', { oldIndex, newIndex, activeId: active.id, overId: over?.id })
        
        const newOrder = arrayMove(orderedProjects, oldIndex, newIndex)
        console.log('📋 New order:', newOrder.map(p => ({ id: p.id, name: p.name })))
        
        // Update local state first
        setOrderedProjects(newOrder)
        
        // Save new order to database
        if (user?.id) {
          console.log('💾 Attempting to save order to database for user:', user.id)
          console.log('🔍 User object:', { id: user.id, email: user.email })
          console.log('🔍 Supabase configured:', !!supabase)
          
          await reorderProjects(user.id, newOrder.map(p => p.id))
          console.log('✅ Order saved to database successfully')
        } else {
          console.warn('⚠️ No user ID available, cannot save to database')
          console.log('🔍 User object:', user)
        }
      } catch (error) {
        console.error('❌ Error reordering projects:', error)
        console.error('🔍 Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
          code: (error as any)?.code || 'No code'
        })
        // Show error to user
        alert(`Failed to save project order: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Don't revert to projects prop - maintain the user's order
        console.log('Maintaining user order despite database error')
      } finally {
        setIsReordering(false)
      }
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage your design and research projects</p>
          {isReordering && (
            <p className="text-sm text-blue-600">Saving new order...</p>
          )}
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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedProjects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderedProjects.map((project) => {
              const projectNotes = notes.filter(note => note.project_id === project.id)
              const projectProblemOverview = problemOverviews.find(po => po.project_id === project.id)
              const projectProgressStatuses = allProjectProgressStatus.filter(ps => ps.project_id === project.id)
              const projectUserStories = allUserStories.filter(us => us.project_id === project.id)
              const projectUserJourneys = allUserJourneys.filter(uj => uj.project_id === project.id)
              const projectDesigns = allDesigns.filter(d => d.project_id === project.id)

              return (
                <SortableProjectCard
                  key={project.id}
                  project={project}
                  projectNotes={projectNotes}
                  projectProblemOverview={projectProblemOverview}
                  projectProgressStatuses={projectProgressStatuses}
                  projectUserStories={projectUserStories}
                  projectUserJourneys={projectUserJourneys}
                  projectDesigns={projectDesigns}
                  stakeholderCount={stakeholderCounts[project.id] || 0}
                  onProjectClick={handleProjectClick}
                  onProjectEdit={handleProjectEdit}
                  onProjectDelete={handleProjectDelete}
                />
              )
            })}
            {orderedProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No projects yet. Create your first project to get started!</p>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay for better visual feedback */}
        <DragOverlay>
          {draggedProject ? (
            <SortableProjectCard
              project={draggedProject}
              projectNotes={notes.filter(note => note.project_id === draggedProject.id)}
              projectProblemOverview={problemOverviews.find(po => po.project_id === draggedProject.id)}
              projectProgressStatuses={allProjectProgressStatus.filter(ps => ps.project_id === draggedProject.id)}
              projectUserStories={allUserStories.filter(us => us.project_id === draggedProject.id)}
              projectUserJourneys={allUserJourneys.filter(uj => uj.project_id === draggedProject.id)}
              projectDesigns={allDesigns.filter(d => d.project_id === draggedProject.id)}
              stakeholderCount={stakeholderCounts[draggedProject.id] || 0}
              onProjectClick={handleProjectClick}
              onProjectEdit={handleProjectEdit}
              onProjectDelete={handleProjectDelete}
              isDragOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}