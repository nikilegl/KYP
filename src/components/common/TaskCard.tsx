import React, { useState, memo } from 'react'
import { Check, X, Trash2, Edit, Strikethrough } from 'lucide-react'
import { AssignUserCard } from './AssignUserCard'
import { getProjectById } from '../../lib/database/services/projectService'
import type { Task } from '../../lib/supabase'
import type { WorkspaceUser } from '../../lib/supabase'
import type { Project } from '../../lib/supabase'

interface TaskCardProps {
  task: Task;
  allProjects?: Project[];
  availableUsers?: WorkspaceUser[];
  onUpdateTask: (
    taskId: string,
    updates: {
      name?: string;
      description?: string;
      status?: 'not_complete' | 'complete' | 'no_longer_required';
      assigned_to_user_id?: string;
      project_id?: string;
    }
  ) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  saving?: boolean;
  isEditing?: boolean;
  editingTask?: {
    name: string;
    description: string;
    status: 'not_complete' | 'complete' | 'no_longer_required';
    assignedToUserId?: string;
    projectId?: string;
  };
  onSaveEdit?: () => Promise<void>;
  onCancelEdit?: () => void;
  onEditChange?: (
    field: keyof { name: string; description: string; status: string },
    value: string
  ) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  allProjects = [],
  availableUsers = [],
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  saving = false,
  isEditing = false,
  editingTask,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
}: TaskCardProps) {
  const [projectName, setProjectName] = React.useState<string | null>(null)

  // Load project name when task changes
  React.useEffect(() => {
    const loadProjectName = async () => {
      if (task.project_id) {
        try {
          const project = await getProjectById(task.project_id)
          setProjectName(project?.name || null)
        } catch (error) {
          console.error('Error loading project name:', error)
          setProjectName(null)
        }
      }
    }

    loadProjectName()
  }, [task.project_id])

  const getStatusIcon = (status: string) => {
    // This function is no longer used but kept for potential future use
    return null;
  };

  const getStatusBadge = (status: string) => {
    // This function is no longer used but kept for potential future use
    return null;
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    status: 'not_complete' | 'complete' | 'no_longer_required'
  ) => {
    try {
      await onUpdateTask(taskId, { status });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.checked ? 'complete' : 'not_complete';
    await handleUpdateTaskStatus(task.id, newStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDeleteTask(taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getAssignedUser = () => {
    if (!task.assigned_to_user_id) return null
    return availableUsers.find(user => user.user_id === task.assigned_to_user_id) || null
  }

  const getEditingAssignedUser = () => {
    if (!editingTask?.assignedToUserId) return null
    return availableUsers.find(user => user.user_id === editingTask.assignedToUserId) || null
  }
  return (
    <div className="border-b border-gray-200 pb-4 transition-all duration-500 ease-in-out overflow-hidden last:border-b-0">
      {isEditing && editingTask && onSaveEdit && onCancelEdit && onEditChange ? (
        /* Edit Mode */
        <div className="space-y-3">
          <input
            type="text"
            value={editingTask.name}
            onChange={(e) => onEditChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={saving}
          />

          <textarea
            value={editingTask.description}
            onChange={(e) => onEditChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Task description..."
            disabled={saving}
          />

          <div className="flex items-center gap-3">
            {/* Project Assignment */}
            {allProjects.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Project:</span>
                <select
                  value={editingTask.projectId || ''}
                  onChange={(e) => onEditChange('projectId', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {allProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Assignment */}
            {availableUsers.length > 0 && (
            <AssignUserCard
              availableUsers={availableUsers}
              selectedUser={getEditingAssignedUser()}
              onAssignUser={(user) => onEditChange('assignedToUserId', user.user_id || '')}
              onRemoveUser={() => onEditChange('assignedToUserId', '')}
              inline={true}
            />
          )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSaveEdit}
              disabled={saving || !editingTask.name.trim()}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Check size={14} />
              Save
            </button>

            <button
              onClick={onCancelEdit}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {/* Large Checkbox - Hidden for 'no_longer_required' tasks */}
              {task.status !== 'no_longer_required' && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.status === 'complete'}
                    onChange={handleCheckboxChange}
                    disabled={saving}
                    className="w-6 h-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:opacity-50"
                  />
                </label>
              )}
              <h4
                className={`font-medium text-gray-900 ${
                  task.status === 'no_longer_required' ? 'line-through text-gray-500' : ''
                }`}
              >
                {task.name}
              </h4>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}
            {task.assigned_to_user_id && (
              <div className="mb-2">
                <span className="text-xs text-gray-500">Assigned to: </span>
                <span className="text-xs font-medium text-blue-600">
                  {getAssignedUser()?.user_email || 'Unknown User'}
                </span>
              </div>
            )}
           
            <p className="text-xs text-gray-500">
              Created {new Date(task.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-1 ml-4">
            {/* Edit Button */}
            <button
              onClick={() => onEditTask(task)}
              disabled={saving}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit task"
            >
              <Edit size={14} />
            </button>

            {/* No longer required Button 
   <button
              onClick={() => handleUpdateTaskStatus(task.id, task.status === 'no_longer_required' ? 'not_complete' : 'no_longer_required')}
              disabled={saving}
              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
              title={task.status === 'no_longer_required' ? "Mark as not complete" : "Mark as no longer required"}
            >
              <Strikethrough size={14} />
            </button>

            
            
            */}
           

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteTask(task.id)}
              disabled={saving}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
})

export { TaskCard }