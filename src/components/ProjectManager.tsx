import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Calendar, Loader2, Users, FileText, CheckCircle, AlertCircle, Edit, Trash2, BookOpen, GitBranch, Palette } from 'lucide-react'
import { getProjectStakeholders } from '../lib/database'
import { PROGRESS_QUESTIONS } from '../lib/database'
import type { Project, ProjectProgressStatus, UserStory, UserJourney, Design } from '../lib/supabase'

interface ProjectManagerProps {
  projects: Project[]
  stakeholders?: any[]
  notes?: any[]
  problemOverviews?: any[]
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
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState({ name: '', overview: '' })
  const [creatingProject, setCreatingProject] = useState(false)
  const [updatingProject, setUpdatingProject] = useState(false)

  // State for stakeholder counts
  const [stakeholderCounts, setStakeholderCounts] = useState<Record<string, number>>({})

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

  const getProjectNotesCount = (projectId: string) => {
    return (notes || []).filter(note => note.project_id === projectId).length
  }

  const getProjectUserStoriesCount = (projectId: string) => {
    return allUserStories.filter(story => story.project_id === projectId).length
  }

  const getProjectUserJourneysCount = (projectId: string) => {
    return allUserJourneys.filter(journey => journey.project_id === projectId).length
  }

  const getProjectAssetsCount = (projectId: string) => {
    return allDesigns.filter(design => design.project_id === projectId).length
  }

  const isProblemOverviewCompleted = (projectId: string) => {
    const overview = problemOverviews.find(po => po.project_id === projectId)
    return overview && (overview.what_is_the_problem || overview.should_we_solve_it)
  }

  const getProjectProgressPercentage = (projectId: string): number => {
    const projectProgressStatuses = allProjectProgressStatus.filter(status => status.project_id === projectId)
    const totalQuestions = Object.keys(PROGRESS_QUESTIONS).length
    
    if (totalQuestions === 0) return 0
    
    const completedQuestions = projectProgressStatuses.filter(status => status.is_completed).length
    return Math.round((completedQuestions / totalQuestions) * 100)
  }

  const handleProjectClick = (project: Project) => {
    onSelectProject(project)
  }
  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage all of your design and research projects</p>
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div 
            key={project.id} 
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all relative group cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            {/* Edit/Delete buttons */}
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingProject(project)
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-blue-50 rounded transition-all"
                title="Edit project"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProject(project.id, project.name)
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Delete project"
              >
                <Trash2 size={14} />
              </button>
            </div>

              <div className="flex items-start justify-between mb-4 pr-16">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderOpen size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  </div>
                </div>
              </div>
              
              {/* Project Stats */}
              <div className="space-y-3 mb-4">
                
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center">
                    <FileText size={14} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-600">Research Notes ({getProjectNotesCount(project.id)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center">
                    <BookOpen size={14} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-600">User Stories ({getProjectUserStoriesCount(project.id)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center">
                    <GitBranch size={14} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-600">User Journeys ({getProjectUserJourneysCount(project.id)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center">
                    <Palette size={14} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-600">Designs ({getProjectAssetsCount(project.id)})</span>
                </div>
              </div>
              
            {/* Project Progress Bar */}
         
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Project Progress</span>
                <span className="text-sm font-medium text-gray-900">{getProjectProgressPercentage(project.id)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProjectProgressPercentage(project.id)}%` }}
                ></div>
              </div>
        
            
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No projects yet. Create your first project to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}