import React from 'react'
import { Trash2, Edit, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { UserRoleTag } from './common/UserRoleTag'
import { getPriorityTagStyles } from '../utils/priorityTagStyles'
import { UserStoryEditDetailsModal } from './UserStoryDetail/UserStoryEditDetailsModal'
import type { UserStory, UserRole, WorkspaceUser } from '../lib/supabase'

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

interface UserStoryCardProps {
  story: UserStory
  storyRoles: Record<string, string[]>
  userRoles?: UserRole[]
  userPermissions?: any[]
  availableUsers?: WorkspaceUser[]
  onUpdate?: (story: UserStory, updates: Partial<UserStory>, updatedRoleIds?: string[]) => void
  onDelete?: (storyId: string) => void
  onSelect?: (story: UserStory) => void
  showDeleteButton?: boolean
  isDragOverlay?: boolean
}

export function UserStoryCard({
  story,
  storyRoles,
  userRoles = [],
  userPermissions = [],
  availableUsers = [],
  onUpdate,
  onDelete,
  onSelect,
  showDeleteButton = true,
  isDragOverlay = false
}: UserStoryCardProps) {
  const [showEditModal, setShowEditModal] = React.useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getAssignedRolesList = (storyId: string) => {
    const roleIds = storyRoles[storyId] || []
    return userRoles.filter(role => roleIds.includes(role.id))
  }

  const getUserPermissionById = (permissionId?: string) => {
    if (!permissionId) return null
    return userPermissions.find(permission => permission.id === permissionId)
  }

  const getAssignedUserById = (userId?: string) => {
    if (!userId) return null
    return availableUsers.find(user => user.user_id === userId)
  }

  const statusColors = getStatusColor(story.status || 'Not planned')
  const priorityStyles = getPriorityTagStyles(story.priority_rating || 'should')
  const assignedUser = getAssignedUserById(story.assigned_to_user_id || undefined)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowEditModal(true)
  }

  const handleModalClose = () => {
    setShowEditModal(false)
  }

  const handleStoryUpdatedFromModal = (updatedStory: UserStory, selectedRoleIds: string[]) => {
    if (onUpdate) {
      // Create updates object with only the changed fields
      const updates: Partial<UserStory> = {
        name: updatedStory.name,
        reason: updatedStory.reason,
        estimated_complexity: updatedStory.estimated_complexity,
        priority_rating: updatedStory.priority_rating,
        status: updatedStory.status,
        user_permission_id: updatedStory.user_permission_id,
        assigned_to_user_id: updatedStory.assigned_to_user_id
      }
      onUpdate(story, updates, selectedRoleIds)
    }
    setShowEditModal(false)
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden relative ${
        isDragging ? 'opacity-30 z-10' : ''
      } ${isDragOverlay ? 'shadow-lg' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        if (onSelect) {
          onSelect(story)
        }
      }}
    >
      {/* Priority Header */}
      <div 
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl border-b"
        style={{
          backgroundColor: priorityStyles.backgroundColor,
          borderColor: priorityStyles.borderColor,
          color: priorityStyles.textColor
        }}
      >
        <div 
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: priorityStyles.dotColor }}
        />
        <span className="capitalize">{story.priority_rating || 'should'}</span>
        
        {/* Drag Handle in Header */}
        {!isDragOverlay && (
          <div
            {...attributes}
            {...listeners}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors drag-handle"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="p-4 space-y-4 relative">
        {/* As: Section */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className="text-gray-600">As:</span>
            {story.user_permission_id ? (
              (() => {
                const permission = getUserPermissionById(story.user_permission_id)
                return permission ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
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
            ) : getAssignedRolesList(story.id).length > 0 ? (
              getAssignedRolesList(story.id).map((role) => (
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
          <div class ="">
          {/* Delete Button */}
          {showDeleteButton && onDelete && (
            <>
              <button
                onClick={handleEditClick}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                title="Edit story"
              >
                <Edit size={14} />
              </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(story.id)
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
              title="Delete story"
            >
              <Trash2 size={14} />
            </button>
            </>
          )}
          </div>
        </div>
        
        {/* I want to: Section */}
        <div>
          <h4 className="text-gray-600 mb-2">I want to:</h4>
          <p className="text-xl font-semibold text-gray-900">{story.name}</p>
        </div>
        
        {/* Status Section */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Status:</span>
          <span 
            className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full"
            style={{
              backgroundColor: statusColors.bg,
              color: statusColors.text
            }}
          >
            {story.status || 'Not planned'}
          </span>
        </div>

        {/* Assigned To Section */}
        {assignedUser && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Assigned to:</span>
            <span className="text-sm font-medium text-blue-600">
              {assignedUser.user_email}
            </span>
          </div>
        )}
        
      </div>

      {/* Edit Details Modal */}
      {showEditModal && userRoles && userPermissions && (
        <UserStoryEditDetailsModal
          userStory={story}
          userRoles={userRoles}
          userPermissions={userPermissions}
          availableUsers={availableUsers}
          initialSelectedRoleIds={storyRoles[story.id] || []}
          initialSelectedPermissionId={story.user_permission_id || ''}
          onStoryUpdated={handleStoryUpdatedFromModal}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}