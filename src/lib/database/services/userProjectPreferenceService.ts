import { supabase, isSupabaseConfigured } from '../../supabase'
import type { UserProjectPreference } from '../../supabase'

export const getUserProjectPreferences = async (userId: string): Promise<UserProjectPreference[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_project_preferences_${userId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_project_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user project preferences:', error)
    return []
  }
}

export const updateProjectOrder = async (
  userId: string, 
  workspaceId: string,
  orderedProjects: Array<{ project_id: string; order_index: number }>
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const preferences: UserProjectPreference[] = orderedProjects.map((proj, index) => ({
        id: `pref-${userId}-${proj.project_id}`,
        user_id: userId,
        project_id: proj.project_id,
        order_index: proj.order_index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      localStorage.setItem(`kyp_user_project_preferences_${userId}`, JSON.stringify(preferences))
      return true
    } catch (error) {
      console.error('Error updating project order locally:', error)
      return false
    }
  }

  try {
    // Use upsert to handle both insert and update cases
    const upsertData = orderedProjects.map(proj => ({
      user_id: userId,
      workspace_id: workspaceId,
      project_id: proj.project_id,
      order_index: proj.order_index,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('user_project_preferences')
      .upsert(upsertData, { 
        onConflict: 'user_id,project_id',
        ignoreDuplicates: false 
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating project order:', error)
    return false
  }
}

export const setProjectPreference = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  orderIndex: number
): Promise<UserProjectPreference | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_project_preferences_${userId}`)
      const preferences: UserProjectPreference[] = stored ? JSON.parse(stored) : []
      
      const newPreference: UserProjectPreference = {
        id: `pref-${userId}-${projectId}`,
        user_id: userId,
        workspace_id: workspaceId,
        project_id: projectId,
        order_index: orderIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const existingIndex = preferences.findIndex(p => p.project_id === projectId)
      if (existingIndex >= 0) {
        preferences[existingIndex] = newPreference
      } else {
        preferences.push(newPreference)
      }
      
      localStorage.setItem(`kyp_user_project_preferences_${userId}`, JSON.stringify(preferences))
      return newPreference
    } catch (error) {
      console.error('Error setting project preference locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_project_preferences')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        project_id: projectId,
        order_index: orderIndex,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,project_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error setting project preference:', error)
    return null
  }
}

export const deleteProjectPreference = async (userId: string, projectId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_project_preferences_${userId}`)
      const preferences: UserProjectPreference[] = stored ? JSON.parse(stored) : []
      const filteredPreferences = preferences.filter(p => p.project_id !== projectId)
      localStorage.setItem(`kyp_user_project_preferences_${userId}`, JSON.stringify(filteredPreferences))
      return true
    } catch (error) {
      console.error('Error deleting project preference locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_project_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting project preference:', error)
    return false
  }
}
