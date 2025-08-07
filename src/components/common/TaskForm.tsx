import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { AssignUserCard } from './AssignUserCard'
import type { WorkspaceUser } from '../../lib/supabase'
import type { Project } from '../../lib/supabase'

export interface TaskData {
  name: string
  description: string
  status: 'not_complete' | 'complete' | 'no_longer_required'
  assignedToUserId?: string
  userStoryId?: string
}

interface TaskFormProps {
  initialTaskData?: Partial<TaskData & { projectId?: string; researchNoteId?: string }>
  availableUsers?: WorkspaceUser[]
  allProjects?: Project[]
  initialAssignedUser?: WorkspaceUser | null
  onSubmit: (taskData: TaskData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  isEditing?: boolean
  title?: string
  isInsideModal?: boolean
}

function TaskForm({
  initialTaskData = {},
  availableUsers = [],
  initialAssignedUser = null,
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
  title,
  isInsideModal = false
}: TaskFormProps) {
  const [taskData, setTaskData] = useState<TaskData>({
    name: initialTaskData.name || '',
    description: initialTaskData.description || '',
    status: initialTaskData.status || 'not_complete',
    assignedToUserId: initialTaskData.assignedToUserId
  })
  const [assignedUser, setAssignedUser] = useState<WorkspaceUser | null>(initialAssignedUser)

  const updateTaskData = (field: keyof TaskData, value: string) => {
    setTaskData(prev => ({ ...prev, [field]: value }))
  }

  const handleAssignUser = (user: WorkspaceUser) => {
    setAssignedUser(user)
    setTaskData(prev => ({ ...prev, assignedToUserId: user.user_id }))
  }

  const handleRemoveUser = () => {
    setAssignedUser(null)
    setTaskData(prev => ({ ...prev, assignedToUserId: undefined }))
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!taskData.name.trim()) return
    
    try {
      await onSubmit({
        name: taskData.name.trim(),
        description: taskData.description.trim(),
        status: taskData.status,
        assignedToUserId: taskData.assignedToUserId
      })
      
      // Reset form if creating (not editing)
      if (!isEditing) {
        setTaskData({
          name: '',
          description: '',
          status: 'not_complete',
          assignedToUserId: undefined,
          userStoryId: (initialTaskData as any)?.userStoryId // Keep the user story assignment for subsequent tasks
        })
        setAssignedUser(null)
      }
    } catch (error) {
      console.error('Error submitting task:', error)
    }
  }

  const displayTitle = title || (isEditing ? 'Edit Task' : 'Add New Task')

  return (
    <div>
      {!isInsideModal && (
        <h3 className="text-sm font-medium text-gray-700 mb-3">{displayTitle}</h3>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div>
            <input
              type="text"
              value={taskData.name}
              onChange={(e) => updateTaskData('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task name..."
              required
              disabled={loading}
            />
          </div>
        </div>
        
        <div>
          <textarea
            value={taskData.description}
            onChange={(e) => updateTaskData('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter task description..."
            disabled={loading}
          />
        </div>

        {availableUsers.length > 0 && (
          <div>
            <select
              value={taskData.assignedToUserId || ''}
              onChange={(e) => updateTaskData('assignedToUserId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Unassigned</option>
              {availableUsers
                .filter(user => user.status === 'active')
                .map((user) => (
                  <option key={user.id} value={user.user_id}>
                    {user.user_email}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !taskData.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {loading ? 'Saving...' : 'Save'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export { TaskForm };