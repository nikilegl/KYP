import { supabase, isSupabaseConfigured } from '../../supabase'
import type { UserPermission } from '../../supabase'

export const getUserPermissions = async (): Promise<UserPermission[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_permissions')
      return stored ? JSON.parse(stored) : [
        {
          id: 'perm-general',
          workspace_id: 'default-workspace',
          name: 'General User',
          description: 'Standard user permissions',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'perm-admin',
          workspace_id: 'default-workspace',
          name: 'Administrator',
          description: 'Elevated administrative permissions',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'perm-na',
          workspace_id: 'default-workspace',
          name: 'Not applicable',
          description: 'No specific user permissions apply',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return []
  }
}

export const createUserPermission = async (name: string, description?: string): Promise<UserPermission | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userPermissions = JSON.parse(localStorage.getItem('kyp_user_permissions') || '[]')
      const newUserPermission: UserPermission = {
        id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        description: description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      userPermissions.unshift(newUserPermission)
      localStorage.setItem('kyp_user_permissions', JSON.stringify(userPermissions))
      return newUserPermission
    } catch (error) {
      console.error('Error creating user permission locally:', error)
      return null
    }
  }

  try {
    // Get the workspace (assuming single workspace for now)
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('user_permissions')
      .insert([{
        workspace_id: workspaces?.id || null,
        name,
        description
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user permission:', error)
    return null
  }
}

export const updateUserPermission = async (permissionId: string, updates: { name?: string; description?: string }): Promise<UserPermission | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userPermissions = JSON.parse(localStorage.getItem('kyp_user_permissions') || '[]')
      const updatedUserPermissions = userPermissions.map((permission: UserPermission) => 
        permission.id === permissionId 
          ? { ...permission, ...updates, updated_at: new Date().toISOString() }
          : permission
      )
      localStorage.setItem('kyp_user_permissions', JSON.stringify(updatedUserPermissions))
      
      const updatedPermission = updatedUserPermissions.find((p: UserPermission) => p.id === permissionId)
      return updatedPermission || null
    } catch (error) {
      console.error('Error updating user permission locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .update(updates)
      .eq('id', permissionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user permission:', error)
    return null
  }
}

export const deleteUserPermission = async (permissionId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userPermissions = JSON.parse(localStorage.getItem('kyp_user_permissions') || '[]')
      const filteredUserPermissions = userPermissions.filter((permission: UserPermission) => permission.id !== permissionId)
      localStorage.setItem('kyp_user_permissions', JSON.stringify(filteredUserPermissions))
      return true
    } catch (error) {
      console.error('Error deleting user permission locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('id', permissionId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user permission:', error)
    return false
  }
}