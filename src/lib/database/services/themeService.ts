import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Theme } from '../../supabase'

export const getThemes = async (): Promise<Theme[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_themes')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching themes:', error)
    return []
  }
}

export const getThemeByShortId = async (shortId: number): Promise<Theme | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_themes')
      const themes = stored ? JSON.parse(stored) : []
      return themes.find((theme: Theme) => theme.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching theme by short ID:', error)
    return null
  }
}

export const createTheme = async (name: string, description?: string, color?: string): Promise<Theme | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      const newTheme: Theme = {
        id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        description: description || undefined,
        color: color || '#3B82F6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      themes.unshift(newTheme)
      localStorage.setItem('kyp_themes', JSON.stringify(themes))
      return newTheme
    } catch (error) {
      console.error('Error creating theme locally:', error)
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
      .from('themes')
      .insert([{
        workspace_id: workspaces?.id || null,
        name,
        description,
        color: color || '#3B82F6'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating theme:', error)
    return null
  }
}

export const updateTheme = async (themeId: string, updates: { name?: string; description?: string; color?: string }): Promise<Theme | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      const updatedThemes = themes.map((theme: Theme) => 
        theme.id === themeId 
          ? { ...theme, ...updates, updated_at: new Date().toISOString() }
          : theme
      )
      localStorage.setItem('kyp_themes', JSON.stringify(updatedThemes))
      
      const updatedTheme = updatedThemes.find((t: Theme) => t.id === themeId)
      return updatedTheme || null
    } catch (error) {
      console.error('Error updating theme locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('themes')
      .update(updates)
      .eq('id', themeId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating theme:', error)
    return null
  }
}

export const deleteTheme = async (themeId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      const filteredThemes = themes.filter((theme: Theme) => theme.id !== themeId)
      localStorage.setItem('kyp_themes', JSON.stringify(filteredThemes))
      
      // Also remove all theme associations
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      const filteredUserStories = themeUserStories.filter((tus: any) => tus.theme_id !== themeId)
      localStorage.setItem('kyp_theme_user_stories', JSON.stringify(filteredUserStories))
      
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      const filteredUserJourneys = themeUserJourneys.filter((tuj: any) => tuj.theme_id !== themeId)
      localStorage.setItem('kyp_theme_user_journeys', JSON.stringify(filteredUserJourneys))
      
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      const filteredResearchNotes = themeResearchNotes.filter((trn: any) => trn.theme_id !== themeId)
      localStorage.setItem('kyp_theme_research_notes', JSON.stringify(filteredResearchNotes))
      
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      const filteredAssets = themeAssets.filter((ta: any) => ta.theme_id !== themeId)
      localStorage.setItem('kyp_theme_assets', JSON.stringify(filteredAssets))
      
      return true
    } catch (error) {
      console.error('Error deleting theme locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', themeId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting theme:', error)
    return false
  }
}

// User Story Theme Links
export const linkThemeToUserStory = async (themeId: string, userStoryId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      
      // Check if already linked
      const exists = themeUserStories.some((tus: any) => 
        tus.theme_id === themeId && tus.user_story_id === userStoryId
      )
      
      if (!exists) {
        themeUserStories.push({
          id: `tus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          theme_id: themeId,
          user_story_id: userStoryId,
          created_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_theme_user_stories', JSON.stringify(themeUserStories))
      }
      
      return true
    } catch (error) {
      console.error('Error linking theme to user story locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_user_stories')
      .insert([{
        theme_id: themeId,
        user_story_id: userStoryId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error linking theme to user story:', error)
    return false
  }
}

export const unlinkThemeFromUserStory = async (themeId: string, userStoryId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      const filtered = themeUserStories.filter((tus: any) => 
        !(tus.theme_id === themeId && tus.user_story_id === userStoryId)
      )
      localStorage.setItem('kyp_theme_user_stories', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error unlinking theme from user story locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_user_stories')
      .delete()
      .eq('theme_id', themeId)
      .eq('user_story_id', userStoryId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error unlinking theme from user story:', error)
    return false
  }
}

export const getThemesForUserStory = async (userStoryId: string): Promise<Theme[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      
      const themeIds = themeUserStories
        .filter((tus: any) => tus.user_story_id === userStoryId)
        .map((tus: any) => tus.theme_id)
      
      return themes.filter((theme: Theme) => themeIds.includes(theme.id))
    } catch (error) {
      console.error('Error getting themes for user story locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_user_stories')
      .select(`
        themes (
          id,
          workspace_id,
          name,
          description,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('user_story_id', userStoryId)

    if (error) throw error
    
    return data?.map(item => (item as any).themes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting themes for user story:', error)
    return []
  }
}

// User Journey Theme Links
export const linkThemeToUserJourney = async (themeId: string, userJourneyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      
      // Check if already linked
      const exists = themeUserJourneys.some((tuj: any) => 
        tuj.theme_id === themeId && tuj.user_journey_id === userJourneyId
      )
      
      if (!exists) {
        themeUserJourneys.push({
          id: `tuj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          theme_id: themeId,
          user_journey_id: userJourneyId,
          created_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_theme_user_journeys', JSON.stringify(themeUserJourneys))
      }
      
      return true
    } catch (error) {
      console.error('Error linking theme to user journey locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_user_journeys')
      .insert([{
        theme_id: themeId,
        user_journey_id: userJourneyId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error linking theme to user journey:', error)
    return false
  }
}

export const unlinkThemeFromUserJourney = async (themeId: string, userJourneyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      const filtered = themeUserJourneys.filter((tuj: any) => 
        !(tuj.theme_id === themeId && tuj.user_journey_id === userJourneyId)
      )
      localStorage.setItem('kyp_theme_user_journeys', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error unlinking theme from user journey locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_user_journeys')
      .delete()
      .eq('theme_id', themeId)
      .eq('user_journey_id', userJourneyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error unlinking theme from user journey:', error)
    return false
  }
}

export const getThemesForUserJourney = async (userJourneyId: string): Promise<Theme[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      
      const themeIds = themeUserJourneys
        .filter((tuj: any) => tuj.user_journey_id === userJourneyId)
        .map((tuj: any) => tuj.theme_id)
      
      return themes.filter((theme: Theme) => themeIds.includes(theme.id))
    } catch (error) {
      console.error('Error getting themes for user journey locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_user_journeys')
      .select(`
        themes (
          id,
          workspace_id,
          name,
          description,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('user_journey_id', userJourneyId)

    if (error) throw error
    
    return data?.map(item => (item as any).themes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting themes for user journey:', error)
    return []
  }
}

// Research Note Theme Links
export const linkThemeToResearchNote = async (themeId: string, researchNoteId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      
      // Check if already linked
      const exists = themeResearchNotes.some((trn: any) => 
        trn.theme_id === themeId && trn.research_note_id === researchNoteId
      )
      
      if (!exists) {
        themeResearchNotes.push({
          id: `trn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          theme_id: themeId,
          research_note_id: researchNoteId,
          created_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_theme_research_notes', JSON.stringify(themeResearchNotes))
      }
      
      return true
    } catch (error) {
      console.error('Error linking theme to research note locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_research_notes')
      .insert([{
        theme_id: themeId,
        research_note_id: researchNoteId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error linking theme to research note:', error)
    return false
  }
}

export const unlinkThemeFromResearchNote = async (themeId: string, researchNoteId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      const filtered = themeResearchNotes.filter((trn: any) => 
        !(trn.theme_id === themeId && trn.research_note_id === researchNoteId)
      )
      localStorage.setItem('kyp_theme_research_notes', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error unlinking theme from research note locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_research_notes')
      .delete()
      .eq('theme_id', themeId)
      .eq('research_note_id', researchNoteId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error unlinking theme from research note:', error)
    return false
  }
}

export const getThemesForResearchNote = async (researchNoteId: string): Promise<Theme[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      
      const themeIds = themeResearchNotes
        .filter((trn: any) => trn.research_note_id === researchNoteId)
        .map((trn: any) => trn.theme_id)
      
      return themes.filter((theme: Theme) => themeIds.includes(theme.id))
    } catch (error) {
      console.error('Error getting themes for research note locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_research_notes')
      .select(`
        themes (
          id,
          workspace_id,
          name,
          description,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('research_note_id', researchNoteId)

    if (error) throw error
    
    return data?.map(item => (item as any).themes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting themes for research note:', error)
    return []
  }
}

// Asset Theme Links
export const linkThemeToAsset = async (themeId: string, assetId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      
      // Check if already linked
      const exists = themeAssets.some((ta: any) => 
        ta.theme_id === themeId && ta.asset_id === assetId
      )
      
      if (!exists) {
        themeAssets.push({
          id: `ta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          theme_id: themeId,
          asset_id: assetId,
          created_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_theme_assets', JSON.stringify(themeAssets))
      }
      
      return true
    } catch (error) {
      console.error('Error linking theme to asset locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_assets')
      .insert([{
        theme_id: themeId,
        asset_id: assetId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error linking theme to asset:', error)
    return false
  }
}

export const unlinkThemeFromAsset = async (themeId: string, assetId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      const filtered = themeAssets.filter((ta: any) => 
        !(ta.theme_id === themeId && ta.asset_id === assetId)
      )
      localStorage.setItem('kyp_theme_assets', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error unlinking theme from asset locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('theme_assets')
      .delete()
      .eq('theme_id', themeId)
      .eq('asset_id', assetId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error unlinking theme from asset:', error)
    return false
  }
}

export const getThemesForAsset = async (assetId: string): Promise<Theme[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      const themes = JSON.parse(localStorage.getItem('kyp_themes') || '[]')
      
      const themeIds = themeAssets
        .filter((ta: any) => ta.asset_id === assetId)
        .map((ta: any) => ta.theme_id)
      
      return themes.filter((theme: Theme) => themeIds.includes(theme.id))
    } catch (error) {
      console.error('Error getting themes for asset locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_assets')
      .select(`
        themes (
          id,
          workspace_id,
          name,
          description,
          color,
          created_at,
          updated_at
        )
      `)
      .eq('asset_id', assetId)

    if (error) throw error
    
    return data?.map(item => (item as any).themes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting themes for asset:', error)
    return []
  }
}

// Get content counts for a theme
export const getThemeContentCounts = async (themeId: string): Promise<{ userStories: number; userJourneys: number; researchNotes: number; assets: number }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserStories = JSON.parse(localStorage.getItem('kyp_theme_user_stories') || '[]')
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      const themeAssets = JSON.parse(localStorage.getItem('kyp_theme_assets') || '[]')
      
      return {
        userStories: themeUserStories.filter((tus: any) => tus.theme_id === themeId).length,
        userJourneys: themeUserJourneys.filter((tuj: any) => tuj.theme_id === themeId).length,
        researchNotes: themeResearchNotes.filter((trn: any) => trn.theme_id === themeId).length,
        assets: themeAssets.filter((ta: any) => ta.theme_id === themeId).length
      }
    } catch (error) {
      console.error('Error getting theme content counts locally:', error)
      return { userStories: 0, userJourneys: 0, researchNotes: 0, assets: 0 }
    }
  }

  try {
    const [userStoriesResult, userJourneysResult, researchNotesResult, assetsResult] = await Promise.all([
      supabase
        .from('theme_user_stories')
        .select('id', { count: 'exact' })
        .eq('theme_id', themeId),
      supabase
        .from('theme_user_journeys')
        .select('id', { count: 'exact' })
        .eq('theme_id', themeId),
      supabase
        .from('theme_research_notes')
        .select('id', { count: 'exact' })
        .eq('theme_id', themeId),
      supabase
        .from('theme_assets')
        .select('id', { count: 'exact' })
        .eq('theme_id', themeId)
    ])

    return {
      userStories: userStoriesResult.count || 0,
      userJourneys: userJourneysResult.count || 0,
      researchNotes: researchNotesResult.count || 0,
      assets: assetsResult.count || 0
    }
  } catch (error) {
    console.error('Error getting theme content counts:', error)
    return { userStories: 0, userJourneys: 0, researchNotes: 0, assets: 0 }
  }
}

// Get all themes with their content counts
export const getThemesWithContentCounts = async (): Promise<Array<Theme & { contentCounts: { userStories: number; userJourneys: number; researchNotes: number; assets: number } }>> => {
  try {
    const themes = await getThemes()
    
    const themesWithCounts = await Promise.all(
      themes.map(async (theme) => {
        const contentCounts = await getThemeContentCounts(theme.id)
        return {
          ...theme,
          contentCounts
        }
      })
    )
    
    return themesWithCounts
  } catch (error) {
    console.error('Error getting themes with content counts:', error)
    return []
  }
}