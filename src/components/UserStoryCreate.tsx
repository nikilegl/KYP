import React, { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { getPriorityTagStyles } from '../utils/priorityTagStyles.tsx'
import { StakeholderAvatar } from './common/StakeholderAvatar'
import { TagThemeCard } from './common/TagThemeCard'
import { AssignUserCard } from './common/AssignUserCard'
import type { UserRole } from '../lib/supabase'
import type { Theme } from '../lib/supabase'
import type { WorkspaceUser } from '../lib/supabase'

interface UserStoryCreateProps {
  projectId: string
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  themes: Theme[]
  availableUsers: WorkspaceUser[]
  onBack: () => void
  onThemeCreate: (theme: Theme) => void
  onCreate: (storyData: {
    name: string
    reason?: string
    description: string
    estimatedComplexity: number
    userRoleIds: string[]
    userPermissionId?: string
    assignedToUserId?: string
    priorityRating: 'must' | 'should' | 'could' | 'would'
    themeIds: string[]
  }) => Promise<void>
}

export function UserStoryCreate({ 
  projectId, 
  userRoles, 
  userPermissions,
  themes,
  availableUsers,
  onBack, 
  onThemeCreate,
  onCreate 
}: UserStoryCreateProps) {
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [estimatedComplexity, setEstimatedComplexity] = useState(5)
  const [priorityRating, setPriorityRating] = useState<'must' | 'should' | 'could' | 'would'>('should')
  const [status, setStatus] = useState<'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released'>('Not planned')
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<string[]>([])
  const [selectedUserPermissionId, setSelectedUserPermissionId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([])
  const [assignedUser, setAssignedUser] = useState<WorkspaceUser | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return
    
    setSaving(true)
    try {
      await onCreate({
        name: name.trim(),
        reason: reason.trim() || undefined,
        description: '',
        estimatedComplexity,
        userRoleIds: selectedUserRoleIds,
        userPermissionId: selectedUserPermissionId || undefined,
        assignedToUserId: assignedUser?.user_id || undefined,
        priorityRating,
        status,
        themeIds: selectedThemes.map(theme => theme.id)
      })
      // After successful creation, go back to the user stories dashboard
      onBack()
    } catch (error) {
      console.error('Error creating user story:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleUserRole = (roleId: string) => {
    // Clear user permission when selecting a role
    if (!selectedUserRoleIds.includes(roleId)) {
      setSelectedUserPermissionId('')
    }
    setSelectedUserRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleUserPermissionChange = (permissionId: string) => {
    // Clear user roles when selecting a permission
    if (permissionId) {
      setSelectedUserRoleIds([])
    }
    setSelectedUserPermissionId(permissionId)
  }
  
  const handleThemeAdd = (theme: Theme) => {
    if (!selectedThemes.some(t => t.id === theme.id)) {
      setSelectedThemes([...selectedThemes, theme])
    }
  }

  const handleThemeRemove = (themeId: string) => {
    setSelectedThemes(selectedThemes.filter(theme => theme.id !== themeId))
  }

  const handleAssignUser = (user: WorkspaceUser) => {
    setAssignedUser(user)
  }

  const handleRemoveUser = () => {
    setAssignedUser(null)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 p-6 -mx-6 -mt-6 mb-6 w-full">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to User Stories
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Create User Story</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            As:
          </h2>
          
          <div className="space-y-2 overflow-y-auto">
          <div className="space-y-2">
            {userRoles.length === 0 ? (
              <p className="text-sm text-gray-500">No user roles available</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {userRoles.map(role => {
                const isSelected = selectedUserRoleIds.includes(role.id)
                const isDisabled = selectedUserPermissionId !== ''
                
                return (
                  <div
                    key={role.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                    onClick={() => !isDisabled && toggleUserRole(role.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        
                          <StakeholderAvatar userRole={role} size="sm" />
                       
                        <div className="font-medium text-gray-900">{role.name}</div>
                      </div>
                      
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabled && toggleUserRole(role.id)}
                        disabled={isDisabled}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )
                })}
              </div>
            )}
          </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Or:</h3>
            <select
              value={selectedUserPermissionId}
              onChange={(e) => handleUserPermissionChange(e.target.value)}
              disabled={selectedUserRoleIds.length > 0}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                selectedUserRoleIds.length > 0 ? 'bg-gray-50 cursor-not-allowed opacity-50' : ''
              }`}
            >
              <option value="">Select a user permission...</option>
              {userPermissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {permission.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mt-6">
            <label htmlFor="name" className="block text-lg font-semibold text-gray-900 mb-4">
              I want to: *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., log in to the system"
              required
            />
          </div>
          
          <div className="mt-6">
            <label htmlFor="reason" className="block text-lg font-semibold text-gray-900 mb-4">
              So that:
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="e.g., access my personal dashboard and manage my account"
            />
          </div>
        </div>

        <TagThemeCard
          availableThemes={themes}
          selectedThemes={selectedThemes}
          onThemeAdd={handleThemeAdd}
          onThemeRemove={handleThemeRemove}
          onThemeCreate={onThemeCreate}
        />

        <AssignUserCard
          availableUsers={availableUsers}
          selectedUser={assignedUser}
          onAssignUser={handleAssignUser}
          onRemoveUser={handleRemoveUser}
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Not planned">Not planned</option>
              <option value="Not started">Not started</option>
              <option value="Design in progress">Design in progress</option>
              <option value="Design complete">Design complete</option>
              <option value="Build in progress">Build in progress</option>
              <option value="Released">Released</option>
            </select>
          </div>
          
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Priority Rating
            </label>
            <div className="grid grid-cols-4 gap-3">
              {(['would', 'could', 'should', 'must'] as const).map((priority) => (
                (() => {
                  const styles = getPriorityTagStyles(priority)
                  return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setPriorityRating(priority)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all capitalize font-medium ${
                    priorityRating === priority
                      ? ''
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    backgroundColor: priorityRating === priority ? styles.backgroundColor : 'white',
                    color: priorityRating === priority ? styles.textColor : '#374151',
                    borderColor: priorityRating === priority ? styles.textColor : undefined
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: styles.dotColor }}
                  />
                  {priority}
                </button>
                  )
                })()
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4 mr-1" />
            {saving ? 'Creating...' : 'Create User Story'}
          </button>
        </div>
      </form>
    </div>
  )
}