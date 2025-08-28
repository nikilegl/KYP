import { supabase } from '../../supabase'

export interface UserProjectPreference {
  id: string
  user_id: string
  project_id: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface ProjectWithOrder extends UserProjectPreference {
  project: {
    id: string
    name: string
    overview?: string
    short_id: number
    created_at: string
    updated_at: string
  }
}

/**
 * Get user's project preferences with project details
 */
export async function getUserProjectPreferences(userId: string): Promise<ProjectWithOrder[]> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  try {
    console.log('🔍 Attempting to fetch user project preferences for user:', userId)
    
    // First, let's check if the table exists and what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_project_preferences')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ Table access error:', tableError)
      if (tableError.code === '42703') {
        console.error('🔍 Column error details:', {
          code: tableError.code,
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint
        })
        console.warn('💡 This suggests the table exists but is missing the expected columns')
        console.warn('💡 Expected columns: id, user_id, project_id, order_index, created_at, updated_at')
      }
      return []
    }
    
    console.log('✅ Table exists and is accessible')
    console.log('📊 Table structure info:', tableInfo)
    
    // Now try the actual query
    const { data, error } = await supabase
      .from('user_project_preferences')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('❌ Query error:', error)
      // Check if it's a column doesn't exist error
      if (error.code === '42703' || error.message.includes('does not exist')) {
        console.warn('⚠️ user_project_preferences table exists but is missing expected columns')
        console.warn('💡 Please check the table structure in your Supabase dashboard')
        console.warn('💡 Expected columns: id, user_id, project_id, order_index, created_at, updated_at')
        console.warn('💡 You may need to add the missing columns or recreate the table')
        return [] // Return empty array instead of throwing
      }
      
      // Check if it's an RLS policy violation
      if (error.code === '42501') {
        console.error('🚫 Row Level Security (RLS) policy violation')
        console.error('💡 This usually means the RLS policies are not properly configured')
        console.error('💡 Please run the RLS fix script: supabase/fix_rls_policies.sql')
        console.error('💡 Or check your Supabase dashboard for RLS policy configuration')
        return [] // Return empty array instead of throwing
      }
      
      // Check if it's a permission/forbidden error
      if (error.code === '403' || error.message.includes('Forbidden')) {
        console.error('🚫 Permission denied (403 Forbidden)')
        console.error('💡 This suggests authentication or RLS policy issues')
        console.error('💡 Please check:')
        console.error('   1. You are properly authenticated')
        console.error('   2. RLS policies are correctly configured')
        console.error('   3. Run: supabase/fix_rls_policies.sql')
        return [] // Return empty array instead of throwing
      }
      
      console.error('Error fetching user project preferences:', error)
      throw error
    }

    console.log('✅ Successfully fetched preferences:', data?.length || 0, 'records')
    return data || []
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    // If it's a table doesn't exist error, return empty array
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      console.warn('⚠️ user_project_preferences table does not exist')
      console.warn('💡 Please run the setup SQL script in your Supabase dashboard')
      console.warn('💡 See: supabase/setup_user_project_preferences.sql')
      return []
    }
    throw error
  }
}

/**
 * Update or create project preference for a user
 */
export async function upsertProjectPreference(
  userId: string, 
  projectId: string, 
  orderPosition: number
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  try {
    // Get the user's workspace ID first
    const { data: workspaceUsers } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
    
    const workspaceId = workspaceUsers?.[0]?.workspace_id
    
    if (!workspaceId) {
      console.warn('⚠️ User not found in any workspace, cannot upsert preference')
      return
    }
    
    const { error } = await supabase
      .from('user_project_preferences')
      .upsert({
        user_id: userId,
        project_id: projectId,
        workspace_id: workspaceId,
        order_index: orderPosition,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,project_id'
      })

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42703' || error.message.includes('does not exist')) {
        console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
        console.warn('See: supabase/setup_user_project_preferences.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's an RLS policy violation
      if (error.code === '42501') {
        console.error('🚫 RLS policy violation in upsertProjectPreference')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's a permission/forbidden error
      if (error.code === '403' || error.message.includes('Forbidden')) {
        console.error('🚫 Permission denied in upsertProjectPreference')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      console.error('Error upserting project preference:', error)
      throw error
    }
  } catch (error) {
    // If it's a table doesn't exist error, silently fail
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
      console.warn('See: supabase/setup_user_project_preferences.sql')
      return
    }
    throw error
  }
}

/**
 * Reorder projects for a user
 */
export async function reorderProjects(
  userId: string, 
  projectIds: string[]
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  try {
    console.log('🔄 Starting reorderProjects for user:', userId, 'with projects:', projectIds)
    
    // First, check if user has any existing preferences
    const { data: existingPreferences, error: checkError } = await supabase
      .from('user_project_preferences')
      .select('project_id')
      .eq('user_id', userId)

    if (checkError) {
      console.error('❌ Error checking existing preferences:', checkError)
      throw checkError
    }

    console.log('📊 Existing preferences found:', existingPreferences?.length || 0)

    // If no preferences exist, create them first
    if (!existingPreferences || existingPreferences.length === 0) {
      console.log('🆕 No preferences found, creating initial preferences...')
      await initializeProjectPreferences(userId, projectIds)
      console.log('✅ Initial preferences created')
    }

    // Get the user's workspace ID first
    const { data: workspaceUsers } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
    
    const workspaceId = workspaceUsers?.[0]?.workspace_id
    
    if (!workspaceId) {
      console.warn('⚠️ User not found in any workspace, cannot update preferences')
      throw new Error('User not found in any workspace')
    }
    
    // Now update the order
    const updates = projectIds.map((projectId, index) => ({
      user_id: userId,
      project_id: projectId,
      workspace_id: workspaceId,
      order_index: index,
      updated_at: new Date().toISOString()
    }))

    console.log('💾 Updating preferences with:', updates)

    const { error } = await supabase
      .from('user_project_preferences')
      .upsert(updates, {
        onConflict: 'user_id,project_id'
      })

    if (error) {
      console.error('❌ Error upserting preferences:', error)
      
      // Check if it's a table doesn't exist error
      if (error.code === '42703' || error.message.includes('does not exist')) {
        console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
        console.warn('See: supabase/setup_user_project_preferences.sql')
        throw new Error('Table does not exist')
      }
      
      // Check if it's an RLS policy violation
      if (error.code === '42501') {
        console.error('🚫 RLS policy violation in reorderProjects')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        throw new Error('RLS policy violation')
      }
      
      // Check if it's a permission/forbidden error
      if (error.code === '403' || error.message.includes('Forbidden')) {
        console.error('🚫 Permission denied in reorderProjects')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        throw new Error('Permission denied')
      }
      
      throw error
    }

    console.log('✅ Successfully reordered projects in database')
  } catch (error) {
    console.error('❌ Fatal error in reorderProjects:', error)
    throw error
  }
}

/**
 * Initialize project preferences for a user (called when user first accesses projects)
 */
export async function initializeProjectPreferences(
  userId: string, 
  projectIds: string[]
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  try {
    // Check if user already has preferences
    const { data: existingPreferences } = await supabase
      .from('user_project_preferences')
      .select('project_id')
      .eq('user_id', userId)

    if (existingPreferences && existingPreferences.length > 0) {
      // User already has preferences, don't overwrite
      return
    }

    // Get the user's workspace ID first
    const { data: workspaceUsers } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
    
    const workspaceId = workspaceUsers?.[0]?.workspace_id
    
    if (!workspaceId) {
      console.warn('⚠️ User not found in any workspace, cannot create preferences')
      return
    }
    
    // Create initial preferences with default order
    const initialPreferences = projectIds.map((projectId, index) => ({
      user_id: userId,
      project_id: projectId,
      workspace_id: workspaceId,
      order_index: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('user_project_preferences')
      .insert(initialPreferences)

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42703' || error.message.includes('does not exist')) {
        console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
        console.warn('See: supabase/setup_user_project_preferences.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's an RLS policy violation
      if (error.code === '42501') {
        console.error('🚫 RLS policy violation in initializeProjectPreferences')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's a permission/forbidden error
      if (error.code === '403' || error.message.includes('Forbidden')) {
        console.error('🚫 Permission denied in initializeProjectPreferences')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      console.error('Error initializing project preferences:', error)
      throw error
    }
  } catch (error) {
    // If it's a table doesn't exist error, silently fail
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
      console.warn('See: supabase/setup_user_project_preferences.sql')
      return
    }
    throw error
  }
}

/**
 * Remove project preference when a project is deleted
 */
export async function removeProjectPreference(
  userId: string, 
  projectId: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  try {
    const { error } = await supabase
      .from('user_project_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42703' || error.message.includes('does not exist')) {
        console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
        console.warn('See: supabase/setup_user_project_preferences.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's an RLS policy violation
      if (error.code === '42501') {
        console.error('🚫 RLS policy violation in removeProjectPreference')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      // Check if it's a permission/forbidden error
      if (error.code === '403' || error.message.includes('Forbidden')) {
        console.error('🚫 Permission denied in removeProjectPreference')
        console.error('💡 Please run: supabase/fix_rls_policies.sql')
        return // Silently fail instead of throwing
      }
      
      console.error('Error removing project preference:', error)
      throw error
    }
  } catch (error) {
    // If it's a table doesn't exist error, silently fail
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
      console.warn('user_project_preferences table does not exist. Please run the setup SQL script in your Supabase dashboard.')
      console.warn('See: supabase/setup_user_project_preferences.sql')
      return
    }
    throw error
  }
}
