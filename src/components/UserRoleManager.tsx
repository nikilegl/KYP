import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { UserRoleForm } from './UserRoleManager/UserRoleForm'
import { UserRoleTable } from './UserRoleManager/UserRoleTable'
import type { UserRole } from '../lib/supabase'

interface UserRoleManagerProps {
  userRoles: UserRole[]
  stakeholders?: Stakeholder[]
  onCreateUserRole: (name: string, colour: string, icon?: string, glossy_icon?: string) => Promise<void>
  onUpdateUserRole: (roleId: string, updates: { name?: string; colour?: string; icon?: string; glossy_icon?: string }) => Promise<boolean>
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
  const [newUserRole, setNewUserRole] = useState({ name: '', colour: '#3B82F6', icon: 'Person', glossy_icon: undefined as string | undefined })
  const [creatingUserRole, setCreatingUserRole] = useState(false)
  const [updatingUserRole, setUpdatingUserRole] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingGlossyIcon, setUploadingGlossyIcon] = useState(false)

  const handleCreateUserRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUserRole(true)
    
    try {
      await onCreateUserRole(newUserRole.name, newUserRole.colour, newUserRole.icon, newUserRole.glossy_icon)
      setNewUserRole({ name: '', colour: '#3B82F6', icon: 'Person', glossy_icon: undefined })
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
        icon: editingUserRole.icon,
        glossy_icon: editingUserRole.glossy_icon
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

  const handleGlossyIconUploadCreate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type - only SVG
    if (file.type !== 'image/svg+xml') {
      alert('Please select an SVG file')
      return
    }

    // Validate file size (1MB limit for SVG)
    if (file.size > 1 * 1024 * 1024) {
      alert('File size must be less than 1MB')
      return
    }

    setUploadingGlossyIcon(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const svgContent = e.target?.result as string
        setNewUserRole({ ...newUserRole, glossy_icon: svgContent })
        setUploadingGlossyIcon(false)
      }
      reader.readAsText(file)
    } catch (error) {
      console.error('Error uploading glossy icon:', error)
      alert('Error uploading glossy icon. Please try again.')
      setUploadingGlossyIcon(false)
    }
  }

  const handleGlossyIconUploadEdit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingUserRole) return
    
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type - only SVG
    if (file.type !== 'image/svg+xml') {
      alert('Please select an SVG file')
      return
    }

    // Validate file size (1MB limit for SVG)
    if (file.size > 1 * 1024 * 1024) {
      alert('File size must be less than 1MB')
      return
    }

    setUploadingGlossyIcon(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const svgContent = e.target?.result as string
        setEditingUserRole({ ...editingUserRole, glossy_icon: svgContent })
        setUploadingGlossyIcon(false)
      }
      reader.readAsText(file)
    } catch (error) {
      console.error('Error uploading glossy icon:', error)
      alert('Error uploading glossy icon. Please try again.')
      setUploadingGlossyIcon(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Roles</h1>
          <p className="mt-1 text-sm text-gray-500">Define roles and responsibilities within your workspace</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowUserRoleForm(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Role
        </Button>
      </div>

      {showUserRoleForm && (
        <UserRoleForm
          isEditing={false}
          userRole={newUserRole}
          loading={creatingUserRole}
          uploadingIcon={uploadingGlossyIcon}
          onUpdate={(updates) => setNewUserRole({ ...newUserRole, ...updates })}
          onSubmit={handleCreateUserRole}
          onClose={() => setShowUserRoleForm(false)}
          onGlossyIconUpload={handleGlossyIconUploadCreate}
        />
      )}

      {editingUserRole && (
        <UserRoleForm
          isEditing={true}
          userRole={{
            name: editingUserRole.name,
            colour: editingUserRole.colour,
            icon: editingUserRole.icon || 'Person',
            glossy_icon: editingUserRole.glossy_icon
          }}
          loading={updatingUserRole}
          uploadingIcon={uploadingGlossyIcon}
          onUpdate={(updates) => setEditingUserRole({ ...editingUserRole, ...updates })}
          onSubmit={handleUpdateUserRole}
          onClose={() => setEditingUserRole(null)}
          onGlossyIconUpload={handleGlossyIconUploadEdit}
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