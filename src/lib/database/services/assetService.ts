import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Design, DesignComment } from '../../supabase'

export const getAssets = async (projectId?: string): Promise<Design[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_assets')
      const assets = stored ? JSON.parse(stored) : []
      return projectId ? assets.filter((asset: Design) => asset.project_id === projectId) : assets
    } catch {
      return []
    }
  }

  try {
    let query = supabase
      .from('assets')
      .select(`
        id,
        project_id,
        name,
        snapshot_image_url,
        description,
        link_url,
        short_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    
    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching assets:', error)
    // Fallback to localStorage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_assets')
      const assets = stored ? JSON.parse(stored) : []
      return projectId ? assets.filter((asset: Design) => asset.project_id === projectId) : assets
    } catch {
      return []
    }
  }
}

export const createAsset = async (
  projectId: string,
  name: string,
  snapshotImageUrl?: string,
  description?: string,
  linkUrl?: string,
  userStoryIds: string[] = [],
  researchNoteIds: string[] = []
): Promise<Design | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      const nextShortId = Math.max(0, ...assets.map((a: Design) => a.short_id || 0)) + 1;
      const newAsset: Design = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        snapshot_image_url: snapshotImageUrl || undefined,
        description: description || undefined,
        link_url: linkUrl || undefined,
        short_id: nextShortId, // <-- assign short_id here!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      assets.unshift(newAsset)
      localStorage.setItem('kyp_assets', JSON.stringify(assets))
      
      // Store user story relationships
      if (userStoryIds.length > 0) {
        const assetUserStories = JSON.parse(localStorage.getItem('kyp_asset_user_stories') || '[]')
        userStoryIds.forEach(userStoryId => {
          assetUserStories.push({
            id: `aus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asset_id: newAsset.id,
            user_story_id: userStoryId,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_asset_user_stories', JSON.stringify(assetUserStories))
      }
      
      // Store research note relationships
      if (researchNoteIds.length > 0) {
        const assetResearchNotes = JSON.parse(localStorage.getItem('kyp_asset_research_notes') || '[]')
        researchNoteIds.forEach(researchNoteId => {
          assetResearchNotes.push({
            id: `arn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asset_id: newAsset.id,
            research_note_id: researchNoteId,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_asset_research_notes', JSON.stringify(assetResearchNotes))
      }
      
      return newAsset
    } catch (error) {
      console.error('Error creating asset locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('assets')
      .insert([{
        project_id: projectId,
        name,
        snapshot_image_url: snapshotImageUrl,
        description,
        link_url: linkUrl
      }])
      .select()
      .single()

    if (error) throw error
    
    // Create user story relationships
    if (userStoryIds.length > 0) {
      const userStoryInserts = userStoryIds.map(userStoryId => ({
        asset_id: data.id,
        user_story_id: userStoryId
      }))

      await supabase
        .from('asset_user_stories')
        .insert(userStoryInserts)
    }
    
    // Create research note relationships
    if (researchNoteIds.length > 0) {
      const researchNoteInserts = researchNoteIds.map(researchNoteId => ({
        asset_id: data.id,
        research_note_id: researchNoteId
      }))

      await supabase
        .from('asset_research_notes')
        .insert(researchNoteInserts)
    }
    
    return data
  } catch (error) {
    console.error('Error creating asset:', error)
    return null
  }
}

export const updateAsset = async (
  assetId: string,
  updates: {
    name?: string
    snapshot_image_url?: string
    description?: string
    link_url?: string
    decision_text?: string[]
  },
  userStoryIds?: string[],
  researchNoteIds?: string[]
): Promise<Design | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      const updatedAssets = assets.map((asset: Design) => 
        asset.id === assetId 
          ? { ...asset, ...updates, updated_at: new Date().toISOString() }
          : asset
      )
      localStorage.setItem('kyp_assets', JSON.stringify(updatedAssets))
      
      // Update user story relationships if provided
      if (userStoryIds !== undefined) {
        const assetUserStories = JSON.parse(localStorage.getItem('kyp_asset_user_stories') || '[]')
        const filteredUserStories = assetUserStories.filter((aus: any) => aus.asset_id !== assetId)
        
        userStoryIds.forEach(userStoryId => {
          filteredUserStories.push({
            id: `aus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asset_id: assetId,
            user_story_id: userStoryId,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_asset_user_stories', JSON.stringify(filteredUserStories))
      }
      
      // Update research note relationships if provided
      if (researchNoteIds !== undefined) {
        const assetResearchNotes = JSON.parse(localStorage.getItem('kyp_asset_research_notes') || '[]')
        const filteredResearchNotes = assetResearchNotes.filter((arn: any) => arn.asset_id !== assetId)
        
        researchNoteIds.forEach(researchNoteId => {
          filteredResearchNotes.push({
            id: `arn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asset_id: assetId,
            research_note_id: researchNoteId,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_asset_research_notes', JSON.stringify(filteredResearchNotes))
      }
      
      const updatedAsset = updatedAssets.find((a: Design) => a.id === assetId)
      return updatedAsset || null
    } catch (error) {
      console.error('Error updating asset locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', assetId)
      .select()
      .single()

    if (error) throw error
    
    // Update user story relationships if provided
    if (userStoryIds !== undefined) {
      // Delete existing relationships
      await supabase
        .from('asset_user_stories')
        .delete()
        .eq('asset_id', assetId)

      // Create new relationships
      if (userStoryIds.length > 0) {
        const userStoryInserts = userStoryIds.map(userStoryId => ({
          asset_id: assetId,
          user_story_id: userStoryId
        }))

        await supabase
          .from('asset_user_stories')
          .insert(userStoryInserts)
      }
    }
    
    // Update research note relationships if provided
    if (researchNoteIds !== undefined) {
      // Delete existing relationships
      await supabase
        .from('asset_research_notes')
        .delete()
        .eq('asset_id', assetId)

      // Create new relationships
      if (researchNoteIds.length > 0) {
        const researchNoteInserts = researchNoteIds.map(researchNoteId => ({
          asset_id: assetId,
          research_note_id: researchNoteId
        }))

        await supabase
          .from('asset_research_notes')
          .insert(researchNoteInserts)
      }
    }
    
    return data
  } catch (error) {
    console.error('Error updating asset:', error)
    return null
  }
}

export const deleteAsset = async (assetId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      const filteredAssets = assets.filter((asset: Design) => asset.id !== assetId)
      localStorage.setItem('kyp_assets', JSON.stringify(filteredAssets))
      return true
    } catch (error) {
      console.error('Error deleting asset locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting asset:', error)
    return false
  }
}

export const getAssetsForUserStory = async (userStoryId: string): Promise<Design[]> => {
  if (!userStoryId) {
    return []
  }

  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assetUserStories = JSON.parse(localStorage.getItem('kyp_asset_user_stories') || '[]')
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      
      const assetIds = assetUserStories
        .filter((aus: any) => aus.user_story_id === userStoryId)
        .map((aus: any) => aus.asset_id)
      
      return assets.filter((asset: Design) => assetIds.includes(asset.id))
    } catch (error) {
      console.error('Error getting assets for user story locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_user_stories')
      .select(`
        assets (
          id,
          project_id,
          name,
          snapshot_image_url,
          description,
          link_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_story_id', userStoryId)

    if (error) throw error
    
    return data?.map(item => (item as any).assets).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting assets for user story:', error)
    return []
  }
}

export const getAssetsForResearchNote = async (researchNoteId: string): Promise<Design[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assetResearchNotes = JSON.parse(localStorage.getItem('kyp_asset_research_notes') || '[]')
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      
      const assetIds = assetResearchNotes
        .filter((arn: any) => arn.research_note_id === researchNoteId)
        .map((arn: any) => arn.asset_id)
      
      return assets.filter((asset: Design) => assetIds.includes(asset.id))
    } catch (error) {
      console.error('Error getting assets for research note locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_research_notes')
      .select(`
        assets (
          id,
          project_id,
          name,
          snapshot_image_url,
          description,
          link_url,
          created_at,
          updated_at
        )
      `)
      .eq('research_note_id', researchNoteId)

    if (error) throw error
    
    return data?.map(item => (item as any).assets).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting assets for research note:', error)
    return []
  }
}

export const getUserStoriesForAsset = async (assetId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assetUserStories = JSON.parse(localStorage.getItem('kyp_asset_user_stories') || '[]')
      return assetUserStories
        .filter((aus: any) => aus.asset_id === assetId)
        .map((aus: any) => aus.user_story_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_user_stories')
      .select('user_story_id')
      .eq('asset_id', assetId)

    if (error) throw error
    return data?.map(item => item.user_story_id) || []
  } catch (error) {
    console.error('Error getting user stories for asset:', error)
    return []
  }
}

export const getResearchNotesForAsset = async (assetId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const assetResearchNotes = JSON.parse(localStorage.getItem('kyp_asset_research_notes') || '[]')
      return assetResearchNotes
        .filter((arn: any) => arn.asset_id === assetId)
        .map((arn: any) => arn.research_note_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_research_notes')
      .select('research_note_id')
      .eq('asset_id', assetId)

    if (error) throw error
    return data?.map(item => item.research_note_id) || []
  } catch (error) {
    console.error('Error getting research notes for asset:', error)
    return []
  }
}

export const getAssetsByThemeId = async (themeId: string): Promise<Design[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      const assets = JSON.parse(localStorage.getItem('kyp_assets') || '[]')
      
      const assetIds = themeAssets
        .filter((ta: any) => ta.theme_id === themeId)
        .map((ta: any) => ta.asset_id)
      
      return assets.filter((asset: Design) => assetIds.includes(asset.id))
    } catch (error) {
      console.error('Error getting assets by theme ID locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_assets')
      .select(`
        assets (
          id,
          project_id,
          name,
          snapshot_image_url,
          description,
          link_url,
          short_id,
          created_at,
          updated_at
        )
      `)
      .eq('theme_id', themeId)

    if (error) throw error
    
    return data?.map(item => (item as any).assets).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting assets by theme ID:', error)
    return []
  }
}

export const getAssetByShortId = async (shortId: number): Promise<Design | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_assets')
      const assets = stored ? JSON.parse(stored) : []
      return assets.find((asset: Design) => asset.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id,
        project_id,
        name,
        snapshot_image_url,
        description,
        link_url,
        short_id,
        created_at,
        updated_at
      `)
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching asset by short ID:', error)
    return null
  }
}

// Asset Comments
export const getAssetComments = async (assetId: string): Promise<DesignComment[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_asset_comments')
      const comments = stored ? JSON.parse(stored) : []
      return comments.filter((comment: DesignComment) => comment.design_id === assetId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_comments')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching asset comments:', error)
    return []
  }
}

export const createAssetComment = async (
  assetId: string,
  commentText: string,
  userId: string
): Promise<DesignComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_asset_comments') || '[]')
      const newComment: DesignComment = {
        id: `ac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        design_id: assetId,
        user_id: userId,
        comment_text: commentText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      comments.unshift(newComment)
      localStorage.setItem('kyp_asset_comments', JSON.stringify(comments))
      return newComment
    } catch (error) {
      console.error('Error creating asset comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_comments')
      .insert([{
        asset_id: assetId,
        user_id: userId,
        comment_text: commentText
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating asset comment:', error)
    return null
  }
}

export const updateAssetComment = async (
  commentId: string,
  commentText: string
): Promise<DesignComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_asset_comments') || '[]')
      const updatedComments = comments.map((comment: DesignComment) => 
        comment.id === commentId 
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      localStorage.setItem('kyp_asset_comments', JSON.stringify(updatedComments))
      
      const updatedComment = updatedComments.find((c: DesignComment) => c.id === commentId)
      return updatedComment || null
    } catch (error) {
      console.error('Error updating asset comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('asset_comments')
      .update({ comment_text: commentText })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating asset comment:', error)
    return null
  }
}

export const deleteAssetComment = async (commentId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_asset_comments') || '[]')
      const filteredComments = comments.filter((comment: DesignComment) => comment.id !== commentId)
      localStorage.setItem('kyp_asset_comments', JSON.stringify(filteredComments))
      return true
    } catch (error) {
      console.error('Error deleting asset comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('asset_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting asset comment:', error)
    return false
  }
}