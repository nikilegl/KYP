import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Node, Edge } from '@xyflow/react'

export interface UserJourney {
  id: string
  project_id: string | null
  name: string
  description?: string
  layout?: 'vertical' | 'horizontal'
  status?: 'draft' | 'published'
  flow_data?: {
    nodes: Node[]
    edges: Edge[]
  }
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
  short_id?: number
}

export const getUserJourneys = async (projectId?: string | null): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      if (projectId) {
        const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
        return stored ? JSON.parse(stored) : []
      } else {
        // Get all journeys
        const stored = localStorage.getItem('kyp_user_journeys_all')
        return stored ? JSON.parse(stored) : []
      }
    } catch {
      return []
    }
  }

  try {
    // Get current user to filter draft journeys
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id
    
    let query = supabase
      .from('user_journeys')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error
    
    // Filter results: show published journeys to all, but draft journeys only to creator
    const filteredData = (data || []).filter(journey => {
      // If published, show to everyone
      if (journey.status === 'published') return true
      // If draft, only show to creator
      if (journey.status === 'draft') return journey.created_by === currentUserId
      // Default to showing if no status (for backwards compatibility)
      return true
    })
    
    return filteredData
  } catch (error) {
    console.error('Error fetching user journeys:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      if (projectId) {
        const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
        return stored ? JSON.parse(stored) : []
      } else {
        const stored = localStorage.getItem('kyp_user_journeys_all')
        return stored ? JSON.parse(stored) : []
      }
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}

export const getAllUserJourneys = async (): Promise<UserJourney[]> => {
  return getUserJourneys(null)
}

export const getUserJourneyById = async (journeyId: string): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('kyp_user_journeys_'))
        .flatMap(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            return []
          }
        })
      return allJourneys.find((j: UserJourney) => j.id === journeyId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .select('*')
      .eq('id', journeyId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user journey:', error)
    return null
  }
}

export const getUserJourneyByShortId = async (
  shortId: number, 
  onlyPublished: boolean = false
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('kyp_user_journeys_'))
        .flatMap(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            return []
          }
        })
      const journey = allJourneys.find((j: UserJourney) => j.short_id === shortId)
      if (journey && onlyPublished && journey.status !== 'published') {
        return null
      }
      return journey || null
    } catch {
      return null
    }
  }

  try {
    // Build the query
    let query = supabase
      .from('user_journeys')
      .select('*')
      .eq('short_id', shortId)
    
    // Only filter by published status if onlyPublished is true (for public access)
    if (onlyPublished) {
      query = query.eq('status', 'published')
    }
    
    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching user journey by short ID:', error)
      // If it's a 406 or 401 error, it might be an RLS issue
      if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('permission denied')) {
        console.error('RLS policy may be blocking access. Make sure RLS policies are configured correctly.')
      }
      throw error
    }
    return data
  } catch (error) {
    console.error('Error fetching user journey by short ID:', error)
    return null
  }
}

export const createUserJourney = async (
  name: string,
  description: string = '',
  flowData: { nodes: Node[]; edges: Edge[] },
  projectId?: string | null,
  layout: 'vertical' | 'horizontal' = 'vertical'
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const storageKey = projectId ? `kyp_user_journeys_${projectId}` : 'kyp_user_journeys_all'
      const stored = localStorage.getItem(storageKey)
      const journeys = stored ? JSON.parse(stored) : []
      const newJourney: UserJourney = {
        id: `local_${Date.now()}`,
        project_id: projectId || null,
        name,
        description,
        layout,
        flow_data: flowData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        short_id: journeys.length + 1,
      }
      
      const updatedJourneys = [newJourney, ...journeys]
      localStorage.setItem(storageKey, JSON.stringify(updatedJourneys))
      return newJourney
    } catch (error) {
      console.error('Error in local storage fallback:', error)
      return null
    }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('user_journeys')
      .insert([
        {
          project_id: projectId || null,
          name,
          description,
          layout,
          flow_data: flowData,
          created_by: user?.id || null,
          updated_by: user?.id || null
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating user journey:', error)
    return null
  }
}

export const updateUserJourney = async (
  journeyId: string,
  updates: {
    name?: string
    description?: string
    layout?: 'vertical' | 'horizontal'
    status?: 'draft' | 'published'
    flow_data?: { nodes: Node[]; edges: Edge[] }
    project_id?: string | null
  }
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('kyp_user_journeys_'))
      
      for (const key of allKeys) {
        const stored = localStorage.getItem(key)
        const journeys = stored ? JSON.parse(stored) : []
        const journeyIndex = journeys.findIndex((j: UserJourney) => j.id === journeyId)
        
        if (journeyIndex !== -1) {
          journeys[journeyIndex] = {
            ...journeys[journeyIndex],
            ...updates,
            updated_at: new Date().toISOString()
          }
          
          localStorage.setItem(key, JSON.stringify(journeys))
          return journeys[journeyIndex]
        }
      }
      return null
    } catch {
      return null
    }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('user_journeys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
      })
      .eq('id', journeyId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user journey:', error)
    return null
  }
}

export const deleteUserJourney = async (journeyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('kyp_user_journeys_'))
      
      for (const key of allKeys) {
        const stored = localStorage.getItem(key)
        const journeys = stored ? JSON.parse(stored) : []
        const filteredJourneys = journeys.filter((j: UserJourney) => j.id !== journeyId)
        
        if (filteredJourneys.length !== journeys.length) {
          localStorage.setItem(key, JSON.stringify(filteredJourneys))
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_journeys')
      .delete()
      .eq('id', journeyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user journey:', error)
    return false
  }
}

// Law Firm associations
export const getUserJourneyLawFirms = async (journeyId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_journey_law_firms_${journeyId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firm_user_journeys')
      .select('law_firm_id')
      .eq('user_journey_id', journeyId)

    if (error) throw error
    return (data || []).map(item => item.law_firm_id)
  } catch (error) {
    console.error('Error fetching user journey law firms:', error)
    return []
  }
}

export const setUserJourneyLawFirms = async (
  journeyId: string,
  lawFirmIds: string[]
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      localStorage.setItem(`kyp_user_journey_law_firms_${journeyId}`, JSON.stringify(lawFirmIds))
      return true
    } catch {
      return false
    }
  }

  try {
    // First, delete existing associations
    const { error: deleteError } = await supabase
      .from('law_firm_user_journeys')
      .delete()
      .eq('user_journey_id', journeyId)

    if (deleteError) throw deleteError

    // Then, insert new associations
    if (lawFirmIds.length > 0) {
      const { error: insertError } = await supabase
        .from('law_firm_user_journeys')
        .insert(
          lawFirmIds.map(lawFirmId => ({
            user_journey_id: journeyId,
            law_firm_id: lawFirmId
          }))
        )

      if (insertError) throw insertError
    }

    return true
  } catch (error) {
    console.error('Error setting user journey law firms:', error)
    return false
  }
}

