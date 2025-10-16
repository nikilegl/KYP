import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Node, Edge } from '@xyflow/react'

export interface UserJourney {
  id: string
  project_id: string
  name: string
  description?: string
  flow_data?: {
    nodes: Node[]
    edges: Edge[]
  }
  created_at: string
  updated_at: string
  short_id?: number
}

export const getUserJourneys = async (projectId: string): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user journeys:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
      return stored ? JSON.parse(stored) : []
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
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

export const createUserJourney = async (
  projectId: string,
  name: string,
  description: string = '',
  flowData: { nodes: Node[]; edges: Edge[] }
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
      const journeys = stored ? JSON.parse(stored) : []
      const newJourney: UserJourney = {
        id: `local_${Date.now()}`,
        project_id: projectId,
        name,
        description,
        flow_data: flowData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        short_id: journeys.length + 1,
      }
      
      const updatedJourneys = [newJourney, ...journeys]
      localStorage.setItem(`kyp_user_journeys_${projectId}`, JSON.stringify(updatedJourneys))
      return newJourney
    } catch (error) {
      console.error('Error in local storage fallback:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .insert([
        {
          project_id: projectId,
          name,
          description,
          flow_data: flowData
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
    flow_data?: { nodes: Node[]; edges: Edge[] }
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
    const { data, error } = await supabase
      .from('user_journeys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
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

