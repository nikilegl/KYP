import React from 'react'
import { FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../lib/supabase'

interface StakeholderProjectsProps {
  projects: Project[]
  loading: boolean
  onProjectClick?: (project: Project) => void
}

export function StakeholderProjects({ projects, loading, onProjectClick }: StakeholderProjectsProps) {
  const navigate = useNavigate()

  const handleProjectClick = (project: Project) => {
    if (onProjectClick) {
      onProjectClick(project)
    } else {
      // Fallback navigation - go to project dashboard
      navigate(`/?project=${project.id}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Projects ({projects.length})
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Projects ({projects.length})
      </h3>
      
      {projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => handleProjectClick(project)}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderOpen size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{project.name}</p>
                {project.overview && (
                  <p className="text-sm text-gray-600 mt-1">{project.overview}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Not assigned to any projects yet.</p>
        </div>
      )}
    </div>
  )
}