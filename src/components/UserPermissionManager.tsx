import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { UserPermissionForm } from './UserPermissionManager/UserPermissionForm'
import { UserPermissionTable } from './UserPermissionManager/UserPermissionTable'
import type { UserPermission, Stakeholder } from '../lib/supabase'

interface UserPermissionManagerProps {
  userPermissions: UserPermission[]
  stakeholders?: Stakeholder[]
  onCreateUserPermission: (name: string, description?: string) => Promise<void>
  onUpdateUserPermission: (permissionId: string, updates: { name?: string; description?: string }) => Promise<void>
  onDeleteUserPermission: (permissionId: string) => Promise<void>
  onNavigateToStakeholders?: (userPermissionId: string) => void
}

export function UserPermissionManager({ 
  userPermissions, 
  stakeholders = [],
  onCreateUserPermission, 
  onUpdateUserPermission, 
  onDeleteUserPermission,
  onNavigateToStakeholders
}: UserPermissionManagerProps) {
  const [showUserPermissionForm, setShowUserPermissionForm] = useState(false)
  const [editingUserPermission, setEditingUserPermission] = useState<UserPermission | null>(null)
  const [newUserPermission, setNewUserPermission] = useState({ name: '', description: '' })
  const [creatingUserPermission, setCreatingUserPermission] = useState(false)
  const [updatingUserPermission, setUpdatingUserPermission] = useState(false)

  const handleCreateUserPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUserPermission(true)
    
    try {
      await onCreateUserPermission(newUserPermission.name, newUserPermission.description || undefined)
      setNewUserPermission({ name: '', description: '' })
      setShowUserPermissionForm(false)
    } catch (error) {
      console.error('Error creating user permission:', error)
    } finally {
      setCreatingUserPermission(false)
    }
  }

  const handleUpdateUserPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUserPermission) return
    
    setUpdatingUserPermission(true)
    
    try {
      await onUpdateUserPermission(editingUserPermission.id, {
        name: editingUserPermission.name,
        description: editingUserPermission.description
      })
      setEditingUserPermission(null)
    } catch (error) {
      console.error('Error updating user permission:', error)
    } finally {
      setUpdatingUserPermission(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Permissions</h2>
          <p className="text-gray-600">Define permission levels and access controls within your workspace</p>
        </div>
        <div>
          <button
            onClick={() => setShowUserPermissionForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Add Permission
          </button>
        </div>
      </div>

      {showUserPermissionForm && (
        <UserPermissionForm
          isEditing={false}
          userPermission={newUserPermission}
          loading={creatingUserPermission}
          onUpdate={(updates) => setNewUserPermission({ ...newUserPermission, ...updates })}
          onSubmit={handleCreateUserPermission}
          onClose={() => setShowUserPermissionForm(false)}
        />
      )}

      {editingUserPermission && (
        <UserPermissionForm
          isEditing={true}
          userPermission={{
            name: editingUserPermission.name,
            description: editingUserPermission.description || ''
          }}
          loading={updatingUserPermission}
          onUpdate={(updates) => setEditingUserPermission({ ...editingUserPermission, ...updates })}
          onSubmit={handleUpdateUserPermission}
          onClose={() => setEditingUserPermission(null)}
        />
      )}

      <UserPermissionTable
        userPermissions={userPermissions}
        stakeholders={stakeholders || []}
        onEdit={setEditingUserPermission}
        onDelete={onDeleteUserPermission}
        onNavigateToStakeholders={onNavigateToStakeholders}
      />
    </div>
  )
}