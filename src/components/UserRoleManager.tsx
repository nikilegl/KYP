import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { UserRoleForm } from './UserRoleManager/UserRoleForm'
import { UserRoleTable } from './UserRoleManager/UserRoleTable'
import type { UserRole } from '../lib/supabase'

interface UserRoleManagerProps {
  userRoles: UserRole[]
  stakeholders?: Stakeholder[]
  onCreateUserRole: (name: string, colour: string, icon?: string) => Promise<void>
  onUpdateUserRole: (roleId: string, updates: { name?: string; colour?: string; icon?: string }) => Promise<void>
  onDeleteUserRole: (roleId: string) => Promise<void>
  onNavigateToStakeholders?: (userRoleId: string) => void
}

export function UserRoleManager({ 
  userRoles, 
  stakeholders = [],
  onCreateUserRole, 
  onUpdateUserRole, 
  onDeleteUserRole,
  onNavigateToStakeholders,
}: UserRoleManagerProps) {
  const [showUserRoleForm, setShowUserRoleForm] = useState(false)
  const [editingUserRole, setEditingUserRole] = useState<UserRole | null>(null)
  const [newUserRole, setNewUserRole] = useState({ name: '', colour: '#3B82F6', icon: 'Person' })
  const [creatingUserRole, setCreatingUserRole] = useState(false)
  const [updatingUserRole, setUpdatingUserRole] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)

  const handleCreateUserRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUserRole(true)
    
    try {
      await onCreateUserRole(newUserRole.name, newUserRole.colour, newUserRole.icon)
      setNewUserRole({ name: '', colour: '#3B82F6', icon: 'Person' })
      setShowUserRoleForm(false)
    } catch (error) {
      console.error('Error creating user role:', error)
    } finally {
      setCreatingUserRole(false)
    }
  }

  const handleUpdateUserRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUserRole) return
    
    setUpdatingUserRole(true)
    
    try {
      // Ensure colour is never null or undefined
      const safeColour = editingUserRole.colour || '#6B7280'
      
      const success = await onUpdateUserRole(editingUserRole.id, {
        name: editingUserRole.name,
        colour: safeColour,
        icon: editingUserRole.icon
      })
      
      if (success) {
        setEditingUserRole(null)
      } else {
        console.error('Failed to update user role')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
    } finally {
      setUpdatingUserRole(false)
    }
  }

  const handleCustomIconUploadCreate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setUploadingIcon(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target?.result as string
        setNewUserRole({ ...newUserRole, icon: base64String })
        setUploadingIcon(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading icon:', error)
      alert('Error uploading icon. Please try again.')
      setUploadingIcon(false)
    }
  }

  const handleCustomIconUploadEdit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingUserRole) return
    
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setUploadingIcon(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64String = e.target?.result as string
        setEditingUserRole({ ...editingUserRole, icon: base64String })
        setUploadingIcon(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading icon:', error)
      alert('Error uploading icon. Please try again.')
      setUploadingIcon(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Roles</h2>
          <p className="text-gray-600">Define roles and responsibilities within your workspace</p>
        </div>
        <div>
          <button
            onClick={() => setShowUserRoleForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Add Role
          </button>
        </div>
      </div>

      {showUserRoleForm && (
        <UserRoleForm
          isEditing={false}
          userRole={newUserRole}
          loading={creatingUserRole}
          uploadingIcon={uploadingIcon}
          onUpdate={(updates) => setNewUserRole({ ...newUserRole, ...updates })}
          onSubmit={handleCreateUserRole}
          onClose={() => setShowUserRoleForm(false)}
          onCustomIconUpload={handleCustomIconUploadCreate}
        />
      )}

      {editingUserRole && (
        <UserRoleForm
          isEditing={true}
          userRole={{
            name: editingUserRole.name,
            colour: editingUserRole.colour,
            icon: editingUserRole.icon || 'Person'
          }}
          loading={updatingUserRole}
          uploadingIcon={uploadingIcon}
          onUpdate={(updates) => setEditingUserRole({ ...editingUserRole, ...updates })}
          onSubmit={handleUpdateUserRole}
          onClose={() => setEditingUserRole(null)}
          onCustomIconUpload={handleCustomIconUploadEdit}
        />
      )}

      <UserRoleTable
        userRoles={userRoles}
        stakeholders={stakeholders || []}
        onEdit={setEditingUserRole}
        onDelete={onDeleteUserRole}
        onNavigateToStakeholders={onNavigateToStakeholders}
      />
    </div>
  )
}