import React, { useState, useEffect } from 'react'
import { ClipboardList, Plus, X } from 'lucide-react'
import { TaskCard } from './common/TaskCard'
import { TaskForm, type TaskData } from './common/TaskForm'
import { getTasks, createTask, updateTask, deleteTask } from '../lib/database'
import type { Task } from '../lib/supabase'
import type { WorkspaceUser } from '../lib/supabase'

interface TasksSectionProps {
  researchNoteId?: string
  userStoryId?: string
  projectId?: string
  tasks: Task[]
  availableUsers?: WorkspaceUser[]
  onCreateTask: (name: string, description: string, status: string, assignedToUserId?: string, userStoryId?: string) => Promise<void>
  onUpdateTask: (taskId: string, updates: { name?: string; description?: string; status?: string }) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  saving: boolean
}

export function TasksSection({ 
  researchNoteId,
  userStoryId,
  projectId,
  tasks,
  availableUsers = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  saving
}: TasksSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState({
    name: '',
    description: '',
    status: 'not_complete' as 'not_complete' | 'complete' | 'no_longer_required',
    assignedToUserId: undefined as string | undefined
  })

  const handleCreateTaskSubmit = async (taskData: TaskData) => {
    try {
      await onCreateTask(
        taskData.name,
        taskData.description,
        taskData.status,
        taskData.assignedToUserId,
        userStoryId
      )
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleUpdateTaskWrapper = async (taskId: string, updates: { 
    name?: string
    description?: string
    status?: 'not_complete' | 'complete' | 'no_longer_required'
    assigned_to_user_id?: string
  }) => {
    try {
      // Only pass the fields that are actually being updated
      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.assigned_to_user_id !== undefined) updateData.assigned_to_user_id = updates.assigned_to_user_id
      
      await onUpdateTask(taskId, updateData)
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id)
    setEditingTask({
      name: task.name,
      description: task.description || '',
      status: task.status,
      assignedToUserId: task.assigned_to_user_id || undefined
    })
  }

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingTask.name.trim()) return
    
    try {
      await handleUpdateTaskWrapper(editingTaskId, {
        name: editingTask.name.trim(),
        description: editingTask.description.trim() || undefined,
        status: editingTask.status,
        assigned_to_user_id: editingTask.assignedToUserId || undefined
      })
      setEditingTaskId(null)
      setEditingTask({ name: '', description: '', status: 'not_complete', assignedToUserId: undefined })
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditingTask({ name: '', description: '', status: 'not_complete', assignedToUserId: undefined })
  }

  const handleEditChange = (field: keyof typeof editingTask, value: string) => {
    setEditingTask(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 rounded-lg hover:bg-gray-100 transition-all"
        >
          <Plus size={20} />
          Add Task
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              availableUsers={availableUsers}
              onUpdateTask={handleUpdateTaskWrapper}
              onDeleteTask={onDeleteTask}
              onEditTask={handleEditTask}
              saving={saving}
              isEditing={editingTaskId === task.id}
              editingTask={editingTaskId === task.id ? editingTask : undefined}
              onSaveEdit={editingTaskId === task.id ? handleSaveEdit : undefined}
              onCancelEdit={editingTaskId === task.id ? handleCancelEdit : undefined}
              onEditChange={editingTaskId === task.id ? handleEditChange : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No tasks for this note yet.</p>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <TaskForm
                availableUsers={availableUsers}
                initialTaskData={{ projectId: projectId }}
                onSubmit={handleCreateTaskSubmit}
                onCancel={() => setShowCreateModal(false)}
                loading={saving}
                isEditing={false}
                isInsideModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}