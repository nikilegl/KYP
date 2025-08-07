import React, { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { Project, Stakeholder } from '../../lib/supabase'

interface AddToProjectModalProps {
  stakeholder: Stakeholder
  availableProjects: Project[]
  onAddToProjects: (projectIds: string[]) => Promise<void>
  onClose: () => void
}

export function AddToProjectModal({
  stakeholder,
  availableProjects,
  onAddToProjects,
  onClose
}: AddToProjectModalProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [addingToProjects, setAddingToProjects] = useState(false)

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleAddToProjects = async () => {
    setAddingToProjects(true)
    
    try {
      await onAddToProjects(selectedProjects)
      onClose()
    } catch (error) {
      console.error('Error adding stakeholder to projects:', error)
    } finally {
      setAddingToProjects(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add {stakeholder.name} to Projects</h3>
          {selectedProjects.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {availableProjects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              This stakeholder is already assigned to all available projects.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProjects.map((project) => {
                const isSelected = selectedProjects.includes(project.id)

                return (
                  <div
                    key={project.id}
                    className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleProjectToggle(project.id)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Project Icon */}
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderOpen size={20} className="text-blue-600" />
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {project.name}
                        </h4>
                        {project.overview && (
                          <p className="text-sm text-gray-600 line-clamp-2">{project.overview}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleProjectToggle(project.id)
                        }}
                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                          isSelected 
                            ? 'text-white bg-blue-600 hover:bg-blue-700' 
                            : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                        }`}
                        title={isSelected ? "Remove from selection" : "Add to selection"}
                      >
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {selectedProjects.length > 0 && (
            <button
              onClick={handleAddToProjects}
              disabled={addingToProjects}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {addingToProjects ? 'Adding...' : `Add to ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}`}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={addingToProjects}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}