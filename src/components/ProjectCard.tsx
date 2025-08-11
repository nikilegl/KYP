import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Edit, Trash2, FolderOpen, GripVertical, FileText, BookOpen, GitBranch, Palette } from 'lucide-react'
import type { Project, Stakeholder, ResearchNote, ProblemOverview, ProjectProgressStatus, UserStory, UserJourney, Design } from '../lib/supabase'

interface ProjectCardProps {
  project: Project
  stakeholders: Stakeholder[]
  notes: ResearchNote[]
  problemOverviews: ProblemOverview[]
  allProjectProgressStatus: ProjectProgressStatus[]
  allUserStories: UserStory[]
  allUserJourneys: UserJourney[]
  allDesigns: Design[]
  onSelect: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (projectId: string, projectName: string) => void
  isDragOverlay?: boolean
}

export function ProjectCard({
  project,
  stakeholders,
  notes,
  problemOverviews,
  allProjectProgressStatus,
  allUserStories,
  allUserJourneys,
  allDesigns,
  onSelect,
  onEdit,
  onDelete,
  isDragOverlay = false
}: ProjectCardProps) {
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

  // Calculate project stats
  const projectStakeholders = stakeholders.filter(s => s.id) // Placeholder - would need project-stakeholder relationship
  const projectNotes = notes.filter(note => note.project_id === project.id)
  const projectProblemOverview = problemOverviews.find(po => po.project_id === project.id)
  const projectProgressStatuses = allProjectProgressStatus.filter(ps => ps.project_id === project.id)
  const projectUserStories = allUserStories.filter(us => us.project_id === project.id)
  const projectUserJourneys = allUserJourneys.filter(uj => uj.project_id === project.id)
  const projectDesigns = allDesigns.filter(d => d.project_id === project.id)

  // Calculate progress percentage
  const totalProgressItems = projectProgressStatuses.length
  const completedProgressItems = projectProgressStatuses.filter(ps => ps.is_completed).length
  const progressPercentage = totalProgressItems > 0 ? Math.round((completedProgressItems / totalProgressItems) * 100) : 0

  const handleProjectClick = () => {
    onSelect(project)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(project)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(project.id, project.name)
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all relative group cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOverlay ? 'rotate-2 shadow-lg' : ''}`}
      onClick={handleProjectClick}
    >
      {/* Edit/Delete/Drag buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleEditClick}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-blue-50 rounded transition-all"
          title="Edit project"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
          title="Delete project"
        >
          <Trash2 size={14} />
        </button>
        <div 
          {...attributes}
          {...listeners}
          className="p-1.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>
      </div>

      {/* Project Header */}
      <div className="flex items-start justify-between mb-4 pr-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{project.name}</h3>
          </div>
        </div>
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
