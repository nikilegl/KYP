import { supabase, isSupabaseConfigured } from '../../supabase'
import type { UserStory } from '../../supabase'

export const getUserStories = async (projectId?: string): Promise<UserStory[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_stories')
      const userStories = stored ? JSON.parse(stored) : []
      const filteredStories = projectId ? userStories.filter((story: UserStory) => story.project_id === projectId) : userStories
      // Sort by weighting (ascending), then by created_at (descending) for stories without weighting
      return filteredStories.sort((a: UserStory, b: UserStory) => {
        if (a.weighting !== undefined && b.weighting !== undefined) {
          return a.weighting - b.weighting
        }
        if (a.weighting !== undefined) return -1
        if (b.weighting !== undefined) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    } catch {
      return []
    }
  }

  try {
    let query = supabase
      .from('user_stories')
      .select('*')
      .order('weighting', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: false })
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user stories:', error)
    return []
  }
}

export const getUserStoryByShortId = async (shortId: number): Promise<UserStory | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_stories')
      const stories = stored ? JSON.parse(stored) : []
      return stories.find((story: UserStory) => story.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user story by short ID:', error)
    return null
  }
}

export const createUserStory = async (
  projectId: string,
  name: string,
  description?: string,
  reason?: string,
  estimatedComplexity: number = 5,
  userRoleIds: string[] = [],
  userPermissionId?: string,
  assignedToUserId?: string,
  priorityRating: 'must' | 'should' | 'could' | 'would' = 'should',
  status: 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released' = 'Not planned',
  themeIds: string[] = []
): Promise<UserStory | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]')
      const nextShortId = Math.max(0, ...userStories.map((s: UserStory) => s.short_id || 0)) + 1
      const newStory: UserStory = {
        id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        description: description || '',
        reason: reason || undefined,
        estimated_complexity: estimatedComplexity,
        user_permission_id: userPermissionId || null,
        assigned_to_user_id: assignedToUserId || null,
        priority_rating: priorityRating,
        status,
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      userStories.unshift(newStory)
      localStorage.setItem('kyp_user_stories', JSON.stringify(userStories))
      
      // Store user role associations
      if (userRoleIds.length > 0) {
        const storyRoles = JSON.parse(localStorage.getItem('kyp_user_story_roles') || '[]')
        userRoleIds.forEach(roleId => {
          storyRoles.push({
            id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_story_id: newStory.id,
            user_role_id: roleId,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_user_story_roles', JSON.stringify(storyRoles))
      }
      
      // Store theme associations
      if (themeIds.length > 0) {
        const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
        themeIds.forEach(themeId => {
          themeUserStories.push({
            id: `tus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            theme_id: themeId,
            user_story_id: newStory.id,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_theme_user_stories', JSON.stringify(themeUserStories))
      }
      
      return newStory
    } catch (error) {
      console.error('Error creating user story locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_stories')
      .insert([{
        project_id: projectId,
        name,
        description,
        reason,
        estimated_complexity: estimatedComplexity,
        user_permission_id: userPermissionId,
        assigned_to_user_id: assignedToUserId,
        priority_rating: priorityRating,
        status: status
      }])
      .select()
      .single()

    if (error) throw error

    // Create user role associations
    if (userRoleIds.length > 0) {
      const roleInserts = userRoleIds.map(roleId => ({
        user_story_id: data.id,
        user_role_id: roleId
      }))

      await supabase
        .from('user_story_roles')
        .insert(roleInserts)
    }

    // Create theme associations
    if (themeIds.length > 0) {
      const themeInserts = themeIds.map(themeId => ({
        theme_id: themeId,
        user_story_id: data.id
      }))

      await supabase
        .from('theme_user_stories')
        .insert(themeInserts)
    }

    return data
  } catch (error) {
    console.error('Error creating user story:', error)
    return null
  }
}

export const updateUserStory = async (
  storyId: string,
  updates: {
    name?: string
    description?: string
    reason?: string
    estimated_complexity?: number
    user_permission_id?: string
    assigned_to_user_id?: string
    priority_rating?: 'must' | 'should' | 'could' | 'would'
    status?: 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released'
    weighting?: number
    decision_text?: string[] | null
  },
  userRoleIds?: string[],
  themeIds?: string[]
): Promise<UserStory | null> => {
  console.log('🔵 updateUserStory: Called with storyId:', storyId, 'updates:', updates)
  
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]')
      const updatedStories = userStories.map((story: UserStory) => 
        story.id === storyId 
          ? { ...story, ...updates, updated_at: new Date().toISOString() }
          : story
      )
      localStorage.setItem('kyp_user_stories', JSON.stringify(updatedStories))
      
      // Update user role associations if provided
      if (userRoleIds !== undefined) {
        const storyRoles = JSON.parse(localStorage.getItem('kyp_user_story_roles') || '[]')
        const filteredRoles = storyRoles.filter((sr: any) => sr.user_story_id !== storyId)
        
        userRoleIds.forEach(roleId => {
          filteredRoles.push({
            id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_story_id: storyId,
            user_role_id: roleId,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_user_story_roles', JSON.stringify(filteredRoles))
      }
      
      // Update theme associations if provided
      if (themeIds !== undefined) {
        const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
        const filteredThemes = themeUserStories.filter((tus: any) => tus.user_story_id !== storyId)
        
        themeIds.forEach(themeId => {
          filteredThemes.push({
            id: `tus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            theme_id: themeId,
            user_story_id: storyId,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_theme_user_stories', JSON.stringify(filteredThemes))
      }
      
      const updatedStory = updatedStories.find((s: UserStory) => s.id === storyId)
      console.log('✅ updateUserStory (Local): Returning updated story:', updatedStory)
      return updatedStory || null
    } catch (error) {
      console.error('❌ updateUserStory (Local): Error updating user story locally:', error)
      console.error('Error updating user story locally:', error)
      return null
    }
  }

  try {
    console.log('🔵 updateUserStory (Supabase): Performing database update')
    console.log('🔵 updateUserStory (Supabase): storyId:', storyId, 'updates:', updates)
    const { data, error } = await supabase
      .from('user_stories')
      .update({
        name: updates.name,
        description: updates.description,
        reason: updates.reason,
        estimated_complexity: updates.estimated_complexity,
        user_permission_id: updates.user_permission_id,
        assigned_to_user_id: updates.assigned_to_user_id,
        priority_rating: updates.priority_rating,
        status: updates.status,
        weighting: updates.weighting,
        decision_text: updates.decision_text
      })
      .eq('id', storyId)
      .select()

    if (error) {
      console.error('❌ updateUserStory (Supabase): Database error:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.error('❌ updateUserStory (Supabase): No record found to update')
      return null
    }
    
    const updatedStory = data[0]
    console.log('✅ updateUserStory (Supabase): Database update successful, data:', updatedStory)

    // Update user role associations if provided
    if (userRoleIds !== undefined) {
      console.log('🔵 updateUserStory (Supabase): Updating user role associations')
      // Delete existing associations
      await supabase
        .from('user_story_roles')
        .delete()
        .eq('user_story_id', storyId)

      // Create new associations
      if (userRoleIds.length > 0) {
        const roleInserts = userRoleIds.map(roleId => ({
          user_story_id: storyId,
          user_role_id: roleId
        }))

        await supabase
          .from('user_story_roles')
          .insert(roleInserts)
      }
      console.log('✅ updateUserStory (Supabase): User role associations updated')
    }

    // Update theme associations if provided
    if (themeIds !== undefined) {
      console.log('🔵 updateUserStory (Supabase): Updating theme associations')
      // Delete existing theme associations
      await supabase
        .from('theme_user_stories')
        .delete()
        .eq('user_story_id', storyId)

      // Create new theme associations
      if (themeIds.length > 0) {
        const themeInserts = themeIds.map(themeId => ({
          theme_id: themeId,
          user_story_id: storyId
        }))

        await supabase
          .from('theme_user_stories')
          .insert(themeInserts)
      }
      console.log('✅ updateUserStory (Supabase): Theme associations updated')
    }

    console.log('✅ updateUserStory (Supabase): Returning updated story:', updatedStory)
    return updatedStory
  } catch (error) {
    console.error('❌ updateUserStory (Supabase): Error updating user story:', error)
    console.error('Error updating user story:', error)
    return null
  }
}

export const updateUserStoryOrders = async (orderedStories: Array<{ id: string; weighting: number }>): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]')
      const updatedStories = userStories.map((story: UserStory) => {
        const orderUpdate = orderedStories.find(os => os.id === story.id)
        return orderUpdate 
          ? { ...story, weighting: orderUpdate.weighting, updated_at: new Date().toISOString() }
          : story
      })
      localStorage.setItem('kyp_user_stories', JSON.stringify(updatedStories))
      return true
    } catch (error) {
      console.error('Error updating user story orders locally:', error)
      return false
    }
  }

  try {
    // Use a transaction to update all stories atomically
    const updates = orderedStories.map(story => 
      supabase
        .from('user_stories')
        .update({ weighting: story.weighting })
        .eq('id', story.id)
    )
    
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('Error updating user story orders:', error)
    return false
  }
}

export const deleteUserStory = async (storyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]')
      const filteredStories = userStories.filter((story: UserStory) => story.id !== storyId)
      localStorage.setItem('kyp_user_stories', JSON.stringify(filteredStories))
      
      // Also remove role associations
      const storyRoles = JSON.parse(localStorage.getItem('kyp_user_story_roles') || '[]')
      const filteredRoles = storyRoles.filter((sr: any) => sr.user_story_id !== storyId)
      localStorage.setItem('kyp_user_story_roles', JSON.stringify(filteredRoles))
      
      return true
    } catch (error) {
      console.error('Error deleting user story locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_stories')
      .delete()
      .eq('id', storyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user story:', error)
    return false
  }
}

export const getUserStoryRoles = async (storyId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_story_roles')
      const storyRoles = stored ? JSON.parse(stored) : []
      return storyRoles
        .filter((sr: any) => sr.user_story_id === storyId)
        .map((sr: any) => sr.user_role_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_story_roles')
      .select('user_role_id')
      .eq('user_story_id', storyId)

    if (error) throw error
    return data?.map(item => item.user_role_id) || []
  } catch (error) {
    console.error('Error fetching user story roles:', error)
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_user_story_roles')
      const storyRoles = stored ? JSON.parse(stored) : []
      return storyRoles
        .filter((sr: any) => sr.user_story_id === storyId)
        .map((sr: any) => sr.user_role_id)
    } catch {
      return []
    }
  }
}

export const getUserStoriesByThemeId = async (themeId: string): Promise<UserStory[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]')
      
      const userStoryIds = themeUserStories
        .filter((tus: any) => tus.theme_id === themeId)
        .map((tus: any) => tus.user_story_id)
      
      return userStories.filter((story: UserStory) => userStoryIds.includes(story.id))
    } catch (error) {
      console.error('Error getting user stories by theme ID locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_user_stories')
      .select(`
        user_stories (
          id,
          project_id,
          name,
          description,
          reason,
          estimated_complexity,
          priority_rating,
          user_permission_id,
          assigned_to_user_id,
          status,
          short_id,
          created_at,
          updated_at
        )
      `)
      .eq('theme_id', themeId)

    if (error) throw error
    
    return data?.map(item => (item as any).user_stories).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting user stories by theme ID:', error)
    return []
  }
}