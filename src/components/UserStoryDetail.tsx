import React, { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Edit, Save, X, Users, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { UserRoleTag } from './common/UserRoleTag'
import { PriorityTag } from '../utils/priorityTagStyles'
import { CopyLinkButton } from './common/CopyLinkButton'
import { updateUserStory, getUserStoryRoles } from '../lib/database'
import { CKEditorComponent } from './CKEditorComponent'
import { LinkedDesigns } from './UserStoryDetail/LinkedAssets'
import { UserStoryEditDetailsModal } from './UserStoryDetail/UserStoryEditDetailsModal'
import { TasksSection } from './TasksSection'
import { HistorySection } from './common/HistorySection'
import type { UserStory, Stakeholder, UserRole, LawFirm, UserPermission, Task } from '../lib/supabase'
import type { WorkspaceUser } from '../lib/supabase'
import type { UserStoryComment } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// Helper function to get status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Not planned':
      return { bg: '#F3F4F6', text: '#6B7280' }
    case 'Not started':
      return { bg: '#FEF3C7', text: '#D97706' }
    case 'Design in progress':
      return { bg: '#DBEAFE', text: '#2563EB' }
    case 'Design complete':
      return { bg: '#D1FAE5', text: '#059669' }
    case 'Build in progress':
      return { bg: '#E0E7FF', text: '#7C3AED' }
    case 'Released':
      return { bg: '#DCFCE7', text: '#16A34A' }
    default:
      return { bg: '#F3F4F6', text: '#6B7280' }
  }
}

interface UserStoryDetailProps {
  userStory: UserStory
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  lawFirms: LawFirm[]
  availableUsers: WorkspaceUser[]
  initialSelectedRoleIds: string[]
  userStoryComments: UserStoryComment[]
  currentUser: User | null
  onCreateTask?: (name: string, description: string, status: string, assignedToUserId?: string, userStoryId?: string) => Promise<void>
  onUpdateTask?: (taskId: string, updates: { name?: string; description?: string; status?: string; user_story_id?: string }) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onBack: () => void
  onUpdate: (storyId: string, updates: Partial<UserStory>, updatedRoleIds: string[]) => void
  onAddComment: (commentText: string) => Promise<void>
  onEditComment: (commentId: string, commentText: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  saving?: boolean
}

export function UserStoryDetail({ 
  userStory, 
  assignedStakeholders, 
  userRoles, 
  userPermissions,
  lawFirms, 
  availableUsers,
  initialSelectedRoleIds,
  userStoryComments,
  currentUser,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onBack, 
  onUpdate,
  onAddComment,
  onEditComment,
  onDeleteComment,
  saving: propSaving = false
}: UserStoryDetailProps) {
  const { user } = useAuth()
  const [editingDescription, setEditingDescription] = useState(false)
  const [description, setDescription] = useState(userStory.description || '')
  const [saving, setSaving] = useState(false)
  const [storyRoleIds, setStoryRoleIds] = useState<string[]>(initialSelectedRoleIds)
  const [editingRoles, setEditingRoles] = useState(false)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialSelectedRoleIds)
  const [editingComplexity, setEditingComplexity] = useState(false)
  const [complexity, setComplexity] = useState(userStory.estimated_complexity)
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [assignedUser, setAssignedUser] = useState<WorkspaceUser | null>(null)
  const [showComments, setShowComments] = useState(true)
  const [userStoryTasks, setUserStoryTasks] = useState<Task[]>([])
  const [savingDecision, setSavingDecision] = useState(false)

  // Update local state when initialSelectedRoleIds changes
  useEffect(() => {
    setStoryRoleIds(initialSelectedRoleIds)
  }, [initialSelectedRoleIds])

  useEffect(() => {
    loadAssignedUser()
    loadUserStoryTasks()
  }, [userStory.id])

  // Update assigned user when userStory.assigned_to_user_id changes
  useEffect(() => {
    loadAssignedUser()
  }, [userStory.assigned_to_user_id, availableUsers])

  const loadAssignedUser = () => {
    if (userStory.assigned_to_user_id) {
      const assignedUser = availableUsers.find(u => u.user_id === userStory.assigned_to_user_id)
      setAssignedUser(assignedUser || null)
    } else {
      setAssignedUser(null)
    }
  }

  const loadUserStoryTasks = async () => {
    if (!onCreateTask) return // Only load if task management is available
    if (!userStory.id) return
    
    try {
      const { getTasks } = await import('../lib/database')
      const tasks = await getTasks(undefined, undefined, userStory.id)
      setUserStoryTasks(tasks)
    } catch (error) {
      console.error('Error loading user story tasks:', error)
    }
  }

  const handleSaveDescription = async () => {
    setSaving(true)
    
    try {
      const updates = { description }
      onUpdate(userStory.id, updates, storyRoleIds)
      setEditingDescription(false)
    } catch (error) {
      console.error('Error updating user story description:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveComplexity = async () => {
    setSaving(true)
    
    try {
      const updates = { estimated_complexity: complexity }
      onUpdate(userStory.id, updates, storyRoleIds)
      setEditingComplexity(false)
    } catch (error) {
      console.error('Error updating user story complexity:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRoles = async () => {
    setSaving(true)
    
    try {
      onUpdate(userStory.id, {}, selectedRoleIds)
      setStoryRoleIds(selectedRoleIds)
      setEditingRoles(false)
    } catch (error) {
      console.error('Error updating story roles:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEditDescription = () => {
    setEditingDescription(false)
    setDescription(userStory.description || '')
  }

  const handleCancelEditComplexity = () => {
    setEditingComplexity(false)
    setComplexity(userStory.estimated_complexity)
  }


  const handleCancelEditRoles = () => {
    setEditingRoles(false)
    setSelectedRoleIds(storyRoleIds)
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleAssignUser = async (user: WorkspaceUser) => {
    setSaving(true)
    
    try {
      const updates = { assigned_to_user_id: user.user_id || undefined }
      onUpdate(userStory.id, updates, storyRoleIds)
      setAssignedUser(user)
    } catch (error) {
      console.error('Error assigning user to story:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUser = async () => {
    setSaving(true)
    
    try {
      const updates = { assigned_to_user_id: undefined }
      onUpdate(userStory.id, updates, storyRoleIds)
      setAssignedUser(null)
    } catch (error) {
      console.error('Error removing user from story:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDecision = async (decisionText: string) => {
    setSavingDecision(true)
    try {
      const currentDecisions = userStory.decision_text || []
      // Create a decision object with timestamp instead of just storing the text
      const newDecisionWithTimestamp = `${new Date().toISOString()}|${decisionText}`
      const updatedDecisions = [...currentDecisions, newDecisionWithTimestamp]
      const updates = { decision_text: updatedDecisions }
      onUpdate(userStory.id, updates, storyRoleIds)
    } catch (error) {
      console.error('Error updating decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }

  const handleEditDecision = async (decisionIndex: number, decisionText: string) => {
    setSavingDecision(true)
    try {
      const currentDecisions = userStory.decision_text || []
      const updatedDecisions = [...currentDecisions]
      
      // Extract the original timestamp if it exists, otherwise use current time
      const originalDecision = updatedDecisions[decisionIndex]
      const timestampMatch = originalDecision?.match(/^(.+?)\|(.+)$/)
      const originalTimestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()
      
      // Preserve the original timestamp but update the text
      updatedDecisions[decisionIndex] = `${originalTimestamp}|${decisionText}`
      const updates = { decision_text: updatedDecisions }
      onUpdate(userStory.id, updates, storyRoleIds)
    } catch (error) {
      console.error('Error editing decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }

  const handleDeleteDecision = async (decisionIndex: number) => {
    setSavingDecision(true)
    try {
      const currentDecisions = userStory.decision_text || []
      const updatedDecisions = currentDecisions.filter((_, index) => index !== decisionIndex)
      const updates = { decision_text: updatedDecisions }
      onUpdate(userStory.id, updates, storyRoleIds)
    } catch (error) {
      console.error('Error deleting decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }


  // Wrapper functions to include userStory.id
  const handleAddCommentWrapper = async (commentText: string) => {
    await onAddComment(commentText)
  }

  const handleEditCommentWrapper = async (commentId: string, commentText: string) => {
    await onEditComment(commentId, commentText)
  }

  const handleDeleteCommentWrapper = async (commentId: string) => {
    await onDeleteComment(commentId)
  }

  const handleCreateTaskWrapper = async (name: string, description: string, status: string, assignedToUserId?: string) => {
    if (!onCreateTask) return
    
    try {
      await onCreateTask(name, description, status, assignedToUserId, userStory.id)
      // Reload tasks after creation
      await loadUserStoryTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleUpdateTaskWrapper = async (taskId: string, updates: { name?: string; description?: string; status?: string }) => {
    if (!onUpdateTask) return
    
    try {
      await onUpdateTask(taskId, updates)
      // Reload tasks after update
      await loadUserStoryTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const handleDeleteTaskWrapper = async (taskId: string) => {
    if (!onDeleteTask) return
    
    try {
      await onDeleteTask(taskId)
      // Reload tasks after deletion
      await loadUserStoryTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  const getAssignedRoles = () => {
    return userRoles.filter(role => Array.isArray(storyRoleIds) && storyRoleIds.includes(role.id))
  }

  const getAssignedPermission = () => {
    if (!userStory.user_permission_id) return null
    return userPermissions.find(permission => permission.id === userStory.user_permission_id)
  }
  
  return (
    <div className="h-screen flex flex-col w-full relative">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        {/* Back button and Edit button row */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to User Stories
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditDetailsModal(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Edit size={14} />
              Edit
            </button>
            <CopyLinkButton entityType="user-story" shortId={userStory.short_id} />
          </div>
        </div>
        
        {/* As: section */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-600">As:</span>
          {userStory.user_permission_id ? (
            (() => {
              const permission = getAssignedPermission()
              return permission ? (
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                  permission.name === 'Administrator'
                    ? 'bg-indigo-100 text-indigo-700'
                    : permission.name === 'General User'
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-500'
                }`}>
                  {permission.name === 'Administrator' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {permission.name}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Unknown permission</span>
              )
            })()
          ) : getAssignedRoles().length > 0 ? (
            getAssignedRoles().map((role) => (
              <UserRoleTag
                key={role.id}
                userRole={role}
                size="sm"
              />
            ))
          ) : (
            <span className="text-sm text-gray-500">No roles assigned</span>
          )}
        </div>
        
        {/* I want to: section */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-2xl text-gray-900 font-bold">I want to: </span>
            {userStory.name}
          </h1>
          {userStory.reason && (
            <p className="text-lg text-gray-700 mt-2">
              <span className="font-semibold">So that: </span>
              {userStory.reason}
            </p>
          )}
        </div>
        
        {/* Complexity indicator and assigned user */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PriorityTag 
              priority={userStory.priority_rating || 'should'} 
              className="mr-2" 
            />
            <span 
              className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full"
              style={{
                backgroundColor: getStatusColor(userStory.status || 'Not planned').bg,
                color: getStatusColor(userStory.status || 'Not planned').text
              }}
            >
              {userStory.status || 'Not planned'}
            </span>
          </div>
          
          {/* Assigned User */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Assigned to:</span>
            {assignedUser ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {assignedUser.full_name ? assignedUser.full_name.charAt(0).toUpperCase() : assignedUser.user_email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {assignedUser.full_name || assignedUser.user_email}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowEditDetailsModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Assign user
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 w-full flex">
        <div className="flex-1 space-y-6 p-6">
          {/* Description Section */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Description</h3>
              {!editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit size={14} />
                  Edit
                </button>
              )}
            </div>

            {editingDescription ? (
              <div className="space-y-4">
                <CKEditorComponent
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the user story in detail..."
                  disabled={saving}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDescription}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEditDescription}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {description ? (
                  <div 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <div className="text-gray-500 italic">Add a description for this user story...</div>
                )}
              </div>
            )}
          </div>

          {/* Linked Assets */}
          <LinkedDesigns 
            userStoryId={userStory.id}
            projectId={userStory.project_id}
          />

          {/* Tasks Section - only show if task management handlers are available */}
          {onCreateTask && onUpdateTask && onDeleteTask && (
            <TasksSection
              userStoryId={userStory.id}
              tasks={userStoryTasks}
              availableUsers={availableUsers}
              onCreateTask={handleCreateTaskWrapper}
              onUpdateTask={handleUpdateTaskWrapper}
              onDeleteTask={handleDeleteTaskWrapper}
              saving={false}
            />
          )}

          
        </div>

        {/* History Column */}
        <HistorySection
          entityId={userStory.id}
          entityType="user story"
          comments={userStoryComments}
          decisions={userStory.decision_text || []}
          user={currentUser}
          allUsers={availableUsers}
          showHistory={showComments}
          onAddComment={handleAddCommentWrapper}
          onEditComment={handleEditCommentWrapper}
          onDeleteComment={handleDeleteCommentWrapper}
          onAddDecision={handleUpdateDecision}
          onEditDecision={handleEditDecision}
          onDeleteDecision={handleDeleteDecision}
          saving={propSaving || savingDecision}
        />
      </div>

      {/* Toggle History Button */}
      <button
        onClick={() => setShowComments(!showComments)}
        className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
          showComments ? 'right-[384px]' : 'right-0'
        }`}
        title={showComments ? 'Hide history' : 'Show history'}
      >
        {showComments ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Edit Details Modal */}
      {showEditDetailsModal && (
        <UserStoryEditDetailsModal
          userStory={userStory}
          userRoles={userRoles}
          userPermissions={userPermissions}
          availableUsers={availableUsers}
          initialSelectedRoleIds={storyRoleIds}
          initialSelectedPermissionId={userStory.user_permission_id || ''}
          onStoryUpdated={(updatedStory, updatedRoleIds) => {
            onUpdate(userStory.id, updatedStory, updatedRoleIds)
          }}
          onClose={() => setShowEditDetailsModal(false)}
        />
      )}

    </div>
  )
}