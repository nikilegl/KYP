import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Platform } from '../../supabase'

export const getPlatforms = async (): Promise<Platform[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_platforms')
      console.log('📦 Loading platforms from localStorage:', stored ? JSON.parse(stored).length : 0)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    console.log('🔍 Fetching platforms from database...')
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Current user:', user?.id)
    
    // Check user's workspace
    if (user) {
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()
      
      console.log('🏢 User workspace:', workspaceData?.workspace_id, workspaceError ? `Error: ${workspaceError.message}` : '')
      
      // Check if there are any platforms in this workspace
      const { count } = await supabase
        .from('platforms')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceData?.workspace_id)
      
      console.log('📊 Total platforms in workspace:', count)
    }
    
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching platforms:', error)
      throw error
    }
    
    console.log('✅ Platforms fetched successfully:', data?.length || 0, 'platforms')
    if (data && data.length > 0) {
      console.log('📝 First platform:', data[0])
    }
    return data || []
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return []
  }
}

export const createPlatform = async (
  name: string,
  colour: string = '#5A6698',
  logo?: string
): Promise<Platform | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const platforms = JSON.parse(localStorage.getItem('kyp_platforms') || '[]')
      const newPlatform: Platform = {
        id: `platform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        colour,
        logo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      platforms.unshift(newPlatform)
      localStorage.setItem('kyp_platforms', JSON.stringify(platforms))
      return newPlatform
    } catch (error) {
      console.error('Error creating platform locally:', error)
      return null
    }
  }

  try {
    // Get user's workspace
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { data: workspaces } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('platforms')
      .insert([{
        workspace_id: workspaces?.workspace_id || null,
        name,
        colour,
        logo
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating platform:', error)
    return null
  }
}

export const updatePlatform = async (
  platformId: string,
  updates: Partial<Omit<Platform, 'id' | 'workspace_id' | 'created_at'>>
): Promise<Platform | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const platforms = JSON.parse(localStorage.getItem('kyp_platforms') || '[]')
      const updatedPlatforms = platforms.map((platform: Platform) => 
        platform.id === platformId 
          ? { ...platform, ...updates, updated_at: new Date().toISOString() }
          : platform
      )
      localStorage.setItem('kyp_platforms', JSON.stringify(updatedPlatforms))
      
      const updatedPlatform = updatedPlatforms.find((p: Platform) => p.id === platformId)
      return updatedPlatform || null
    } catch (error) {
      console.error('Error updating platform locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('platforms')
      .update(updates)
      .eq('id', platformId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating platform:', error)
    return null
  }
}

export const deletePlatform = async (platformId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const platforms = JSON.parse(localStorage.getItem('kyp_platforms') || '[]')
      const filteredPlatforms = platforms.filter((platform: Platform) => platform.id !== platformId)
      localStorage.setItem('kyp_platforms', JSON.stringify(filteredPlatforms))
      return true
    } catch (error) {
      console.error('Error deleting platform locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('platforms')
      .delete()
      .eq('id', platformId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting platform:', error)
    return false
  }
}

