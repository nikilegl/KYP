import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, X } from 'lucide-react'
import { TaskCard } from './common/TaskCard'
import { TaskForm, type TaskData } from './common/TaskForm'
import { getTasks, createTask, updateTask, deleteTask, getProjects } from '../lib/database'
import type { Task } from '../lib/supabase'
import type { WorkspaceUser } from '../lib/supabase'
import type { Project } from '../lib/supabase'

interface ProjectTaskManagerProps {
  projectId: string
  workspaceUsers?: WorkspaceUser[]
}

export function ProjectTaskManager({ projectId, workspaceUsers = [] }: ProjectTaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState({
    name: '',
    description: '',
    status: 'not_complete' as 'not_complete' | 'complete' | 'no_longer_required',
    assignedToUserId: undefined as string | undefined
  })

  useEffect(() => {
    loadTasks()
    loadProjects()
  }, [projectId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const projectTasks = await getTasks(projectId)
      
      // Sort tasks only on initial load
      const sortedTasks = [
        // Outstanding tasks first (newest first)
        ...projectTasks.filter(task => task.status === 'not_complete')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        // Complete tasks second (oldest completed first)
        ...projectTasks.filter(task => task.status === 'complete')
          .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()),
        // No longer required tasks last (newest first)
        ...projectTasks.filter(task => task.status === 'no_longer_required')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ]
      
      setTasks(sortedTasks)
    } catch (error) {
      console.error('Error loading project tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const projects = await getProjects()
      setAllProjects(projects)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handleCreateTask = async (taskData: TaskData) => {
    setSaving(true)
    try {
      const newTask = await createTask(
        taskData.projectId || projectId,
        taskData.name,
        taskData.description,
        taskData.status,
        taskData.assignedToUserId
      )
      
      // Add the new task to the existing list instead of reloading all tasks
      if (newTask) {
        setTasks(prevTasks => [newTask, ...prevTasks])
      }
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = useCallback(async (taskId: string, updates: { name?: string; description?: string; status?: string; assigned_to_user_id?: string; project_id?: string }) => {
    setSaving(true)
    try {
      const updatedTask = await updateTask(taskId, updates)
      
      // Update the specific task in the existing list instead of reloading all tasks
      if (updatedTask) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        )
      }
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setSaving(true)
    try {
      const success = await deleteTask(taskId)
      
      // Remove the task from the existing list instead of reloading all tasks
      if (success) {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTaskId(task.id)
    setEditingTask({
      name: task.name,
      description: task.description || '',
      status: task.status,
      assignedToUserId: task.assigned_to_user_id || undefined
    })
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingTaskId || !editingTask.name.trim()) return
    
    try {
      await handleUpdateTask(editingTaskId, {
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
  }, [editingTaskId, editingTask, handleUpdateTask])

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null)
    setEditingTask({ name: '', description: '', status: 'not_complete', assignedToUserId: undefined })
  }, [])

  const handleEditChange = useCallback((field: keyof typeof editingTask, value: string) => {
    setEditingTask(prev => ({ ...prev, [field]: value }))
  }, [])

  // Group tasks by status for statistics only
  const tasksByStatus = {
    not_complete: tasks.filter(task => task.status === 'not_complete'),
    complete: tasks.filter(task => task.status === 'complete'),
    no_longer_required: tasks.filter(task => task.status === 'no_longer_required')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Tasks</h2>
          <p className="text-gray-600 mt-1">Manage all tasks for this project</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Create Task
        </button>
      </div>

      {/* Tasks by Status */}
      <div className="space-y-6">
        {/* All Tasks in Single List */}
        {tasks.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Single Task List */}
            <div className="space-y-3 px-6 py-6">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  allProjects={allProjects}
                  availableUsers={workspaceUsers}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
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
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tasks yet. Create your first task to get started!</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              <TaskForm
                allProjects={allProjects}
                availableUsers={workspaceUsers}
               initialTaskData={{ projectId: projectId }}
                onSubmit={handleCreateTask}
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