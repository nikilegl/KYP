import React, { useState, useEffect } from 'react'
import { ClipboardList, BookOpen, Users, Search, X } from 'lucide-react'
import { TaskCard } from './common/TaskCard'
import { useAuth } from '../hooks/useAuth'
import { UserStoryCard } from './UserStoryCard'
import { MultiSelectUserAssignCard } from './common/MultiSelectUserAssignCard'
import { getTasks, updateTask, deleteTask } from '../lib/database'
import { getUserStories, updateUserStory, deleteUserStory, getUserStoryRoles } from '../lib/database'
import type { Task, UserStory, WorkspaceUser } from '../lib/supabase'

interface WorkspaceDashboardProps {
  workspaceUsers: WorkspaceUser[]
  onSignOut: () => void
}

export function WorkspaceDashboard({ workspaceUsers, onSignOut }: WorkspaceDashboardProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'tasks' | 'user-stories'>('tasks')
  const [selectedUsers, setSelectedUsers] = useState<WorkspaceUser[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [storyRoles, setStoryRoles] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState({
    name: '',
    description: '',
    status: 'not_complete' as 'not_complete' | 'complete' | 'no_longer_required',
    assignedToUserId: undefined as string | undefined
  })

  useEffect(() => {
    loadData()
  }, [])

  // Pre-fill the selected users with the current user when data is available
  useEffect(() => {
    if (user && workspaceUsers.length > 0) {
      const currentWorkspaceUser = workspaceUsers.find(wu => wu.user_id === user.id)
      if (currentWorkspaceUser && selectedUsers.length === 0) {
        setSelectedUsers([currentWorkspaceUser])
      }
    } else if (!user) {
      // Clear selection if user logs out
      setSelectedUsers([])
    }
  }, [user, workspaceUsers])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load all tasks across all projects
      const allTasks = await getTasks()
      setTasks(allTasks)
      
      // Load all user stories across all projects
      const allUserStories = await getUserStories()
      setUserStories(allUserStories)
      
      // Load role assignments for each user story
      const roleMap: Record<string, string[]> = {}
      for (const story of allUserStories) {
        const roleIds = await getUserStoryRoles(story.id)
        roleMap[story.id] = roleIds
      }
      setStoryRoles(roleMap)
    } catch (error) {
      console.error('Error loading workspace data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: { 
    name?: string
    description?: string
    status?: 'not_complete' | 'complete' | 'no_longer_required'
    assigned_to_user_id?: string
  }) => {
    try {
      const updatedTask = await updateTask(taskId, updates)
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
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId)
      if (success) {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
      }
    } catch (error) {
      console.error('Error deleting task:', error)
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
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditingTask({ name: '', description: '', status: 'not_complete', assignedToUserId: undefined })
  }

  const handleEditChange = (field: keyof typeof editingTask, value: string) => {
    setEditingTask(prev => ({ ...prev, [field]: value }))
  }

  const handleUpdateUserStory = async (updatedStory: UserStory, updatedRoleIds?: string[]) => {
    try {
      setUserStories(userStories.map(story => story.id === updatedStory.id ? updatedStory : story))
      
      if (updatedRoleIds !== undefined) {
        setStoryRoles(prev => ({
          ...prev,
          [updatedStory.id]: updatedRoleIds
        }))
      }
    } catch (error) {
      console.error('Error updating user story:', error)
    }
  }

  const handleDeleteUserStory = async (storyId: string) => {
    if (window.confirm('Are you sure you want to delete this user story?')) {
      try {
        const success = await deleteUserStory(storyId)
        if (success) {
          setUserStories(userStories.filter(story => story.id !== storyId))
          setStoryRoles(prev => {
            const updated = { ...prev }
            delete updated[storyId]
            return updated
          })
        }
      } catch (error) {
        console.error('Error deleting user story:', error)
      }
    }
  }

  // Filter data based on selected users and search term
  const selectedUserIds = selectedUsers.map(user => user.user_id).filter(Boolean) as string[]
  
  const filteredTasks = tasks.filter(task => {
    // Only show outstanding (not complete) tasks
    const isOutstanding = task.status === 'not_complete'
    
    const matchesUser = selectedUserIds.length === 0 || 
      (task.assigned_to_user_id && selectedUserIds.includes(task.assigned_to_user_id))
    
    const matchesSearch = !searchTerm || 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return isOutstanding && matchesUser && matchesSearch
  })

  const filteredUserStories = userStories.filter(story => {
    const matchesUser = selectedUserIds.length === 0 || 
      (story.assigned_to_user_id && selectedUserIds.includes(story.assigned_to_user_id))
    
    const matchesSearch = !searchTerm || 
      story.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (story.description && story.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (story.reason && story.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesUser && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Dashboard</h2>
        <p className="text-gray-600">Overview of all of your tasks and user stories across your workspace</p>
      </div>

      {/* User Filter */}
      <MultiSelectUserAssignCard
        availableUsers={workspaceUsers}
        selectedUsers={selectedUsers}
        onUsersChange={setSelectedUsers}
        title="Filter by Assigned Users"
        placeholder="Select users to filter by..."
      />

     

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClipboardList size={20} />
              Outstanding tasks ({filteredTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('user-stories')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'user-stories'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen size={20} />
              User Stories ({filteredUserStories.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'tasks' ? (
            <div className="space-y-4">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    availableUsers={workspaceUsers}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    saving={false}
                    isEditing={editingTaskId === task.id}
                    editingTask={editingTaskId === task.id ? editingTask : undefined}
                    onSaveEdit={editingTaskId === task.id ? handleSaveEdit : undefined}
                    onCancelEdit={editingTaskId === task.id ? handleCancelEdit : undefined}
                    onEditChange={editingTaskId === task.id ? handleEditChange : undefined}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {selectedUsers.length > 0 || searchTerm
                      ? 'No tasks match your current filters.'
                      : 'No tasks found across all projects.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserStories.length > 0 ? (
                filteredUserStories.map((story) => (
                  <UserStoryCard
                    key={story.id}
                    story={story}
                    storyRoles={storyRoles}
                    availableUsers={workspaceUsers}
                    onUpdate={handleUpdateUserStory}
                    onDelete={handleDeleteUserStory}
                    onSelect={(story) => {
                      // Navigate to user story detail
                      window.location.href = `/user-story/${story.short_id}`
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {selectedUsers.length > 0 || searchTerm
                      ? 'No user stories match your current filters.'
                      : 'No user stories found across all projects.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}