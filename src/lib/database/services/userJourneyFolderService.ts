import { supabase } from '../../supabase'

export interface UserJourneyFolder {
  id: string
  workspace_id: string
  name: string
  color: string
  parent_folder_id: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all user journey folders for the current user's workspace
 */
export async function getUserJourneyFolders(): Promise<UserJourneyFolder[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user's workspace
  const { data: workspaceUser, error: workspaceError } = await supabase
    .from('workspace_users')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (workspaceError) {
    throw new Error(`Failed to get workspace: ${workspaceError.message}`)
  }

  // Get folders for the workspace
  const { data, error } = await supabase
    .from('user_journey_folders')
    .select('*')
    .eq('workspace_id', workspaceUser.workspace_id)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch folders: ${error.message}`)
  }

  return data || []
}

/**
 * Create a new user journey folder
 */
export async function createUserJourneyFolder(
  name: string,
  color: string = '#3B82F6',
  parentFolderId: string | null = null
): Promise<UserJourneyFolder> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user's workspace
  const { data: workspaceUser, error: workspaceError } = await supabase
    .from('workspace_users')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (workspaceError) {
    throw new Error(`Failed to get workspace: ${workspaceError.message}`)
  }

  // Create the folder
  const { data, error } = await supabase
    .from('user_journey_folders')
    .insert({
      workspace_id: workspaceUser.workspace_id,
      name,
      color,
      parent_folder_id: parentFolderId,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create folder: ${error.message}`)
  }

  return data
}

/**
 * Update a user journey folder
 */
export async function updateUserJourneyFolder(
  id: string,
  updates: { name?: string; color?: string }
): Promise<UserJourneyFolder> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('user_journey_folders')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update folder: ${error.message}`)
  }

  return data
}

/**
 * Delete a user journey folder
 */
export async function deleteUserJourneyFolder(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journey_folders')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete folder: ${error.message}`)
  }
}

/**
 * Assign multiple user journeys to a folder
 */
export async function assignUserJourneysToFolder(
  journeyIds: string[],
  folderId: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journeys')
    .update({ 
      folder_id: folderId,
      updated_at: new Date().toISOString()
    })
    .in('id', journeyIds)

  if (error) {
    throw new Error(`Failed to assign journeys to folder: ${error.message}`)
  }
}

/**
 * Move a folder to a different parent folder
 */
export async function moveFolderToParent(
  folderId: string,
  parentFolderId: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journey_folders')
    .update({ 
      parent_folder_id: parentFolderId,
      updated_at: new Date().toISOString()
    })
    .eq('id', folderId)

  if (error) {
    throw new Error(`Failed to move folder: ${error.message}`)
  }
}

/**
 * Count user journeys in a folder (including subfolders)
 */
export async function countJourneysInFolder(folderId: string): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { count, error } = await supabase
    .from('user_journeys')
    .select('*', { count: 'exact', head: true })
    .eq('folder_id', folderId)

  if (error) {
    throw new Error(`Failed to count journeys: ${error.message}`)
  }

  return count || 0
}

