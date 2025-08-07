import React, { useState } from 'react'
import { X, Save } from 'lucide-react'
import { getPriorityTagStyles } from '../../utils/priorityTagStyles'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { updateUserStory } from '../../lib/database'
import type { UserStory, UserRole, WorkspaceUser } from '../../lib/supabase'

interface UserStoryEditDetailsModalProps {
  userStory: UserStory
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  availableUsers: WorkspaceUser[]
  initialSelectedRoleIds: string[]
  initialSelectedPermissionId: string
  onStoryUpdated: (updatedStory: UserStory, selectedRoleIds: string[]) => void
  onClose: () => void
}

export function UserStoryEditDetailsModal({
  userStory,
  userRoles,
  userPermissions,
  availableUsers,
  initialSelectedRoleIds,
  initialSelectedPermissionId,
  onStoryUpdated,
  onClose
}: UserStoryEditDetailsModalProps) {
  const [name, setName] = useState(userStory.name)
  const [reason, setReason] = useState(userStory.reason || '')
  const [estimatedComplexity, setEstimatedComplexity] = useState(userStory.estimated_complexity)
  const [priorityRating, setPriorityRating] = useState<'must' | 'should' | 'could' | 'would'>(
    userStory.priority_rating || 'should'
  )
  const [status, setStatus] = useState<'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released'>(
    (userStory.status as 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released') || 'Not planned'
  )
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialSelectedRoleIds)
  const [selectedUserPermissionId, setSelectedUserPermissionId] = useState<string>(initialSelectedPermissionId)
  const [assignedToUserId, setAssignedToUserId] = useState<string>(userStory.assigned_to_user_id || '')
  const [saving, setSaving] = useState(false)

  const toggleRole = (roleId: string) => {
    // Clear user permission when selecting a role
    if (!selectedRoleIds.includes(roleId)) {
      setSelectedUserPermissionId('')
    }
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleUserPermissionChange = (permissionId: string) => {
    // Clear user roles when selecting a permission
    if (permissionId) {
      setSelectedRoleIds([])
    }
    setSelectedUserPermissionId(permissionId)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    
    setSaving(true)
    try {
      const updatedStory = await updateUserStory(userStory.id, {
        name: name.trim(),
        reason: reason.trim() || undefined,
        estimated_complexity: estimatedComplexity,
        priority_rating: priorityRating,
        status,
        user_permission_id: selectedUserPermissionId || undefined,
        assigned_to_user_id: assignedToUserId || null
      }, selectedRoleIds)
      
      if (updatedStory) {
        onStoryUpdated(updatedStory, selectedRoleIds)
        onClose()
      }
    } catch (error) {
      console.error('Error updating user story:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Edit User Story</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-6">
            {/* Assigned User Roles */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">As:</h3>
              <div className="space-y-2">
                {userRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No user roles available</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {userRoles.map(role => {
                      const isSelected = selectedRoleIds.includes(role.id)
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
                          onClick={() => !isDisabled && toggleRole(role.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                
                              >
                                <StakeholderAvatar userRole={role} size="sm" />
                              </div>
                              <div className="font-medium text-gray-900">{role.name}</div>
                            </div>
                            
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => !isDisabled && toggleRole(role.id)}
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

           

            {/* User Permission Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Or:</h3>
              <select
                value={selectedUserPermissionId}
                onChange={(e) => handleUserPermissionChange(e.target.value)}
                disabled={selectedRoleIds.length > 0 || saving}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  selectedRoleIds.length > 0 ? 'bg-gray-50 cursor-not-allowed opacity-50' : ''
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

            {/* User Story Name */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                I want to: *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., log in to the system"
                required
                disabled={saving}
              />
            </div>

            {/* User Story Reason */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                So that:
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., access my personal dashboard and manage my account"
                disabled={saving}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="Not planned">Not planned</option>
                <option value="Not started">Not started</option>
                <option value="Design in progress">Design in progress</option>
                <option value="Design complete">Design complete</option>
                <option value="Build in progress">Build in progress</option>
                <option value="Released">Released</option>
              </select>
            </div>

            

            {/* Priority Rating */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Priority Rating
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['would', 'could', 'should', 'must'] as const).map((priority) => {
                  const styles = getPriorityTagStyles(priority)
                  return (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setPriorityRating(priority)}
                      disabled={saving}
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
                })}
              </div>
            </div>
             {/* Assigned User */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Assign a user</h3>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="">Unassigned</option>
                {(availableUsers || [])
                  .filter(user => user.status === 'active' && user.user_id)
                  .map((user) => (
                    <option key={user.id} value={user.user_id}>
                      {user.full_name || user.user_email}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          
        </div>
        
        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}