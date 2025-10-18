import { supabase, isSupabaseConfigured, ThirdParty } from '../../supabase'

/**
 * Get all third parties for a workspace
 */
export const getThirdParties = async (workspaceId: string): Promise<ThirdParty[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_third_parties_${workspaceId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('third_parties')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching third parties:', error)
    return []
  }
}

/**
 * Get a single third party by ID
 */
export const getThirdPartyById = async (id: string): Promise<ThirdParty | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_third_party_${id}`)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('third_parties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching third party:', error)
    return null
  }
}

/**
 * Create a new third party
 */
export const createThirdParty = async (
  workspaceId: string,
  thirdParty: Omit<ThirdParty, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
): Promise<ThirdParty | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    const newThirdParty: ThirdParty = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      ...thirdParty,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    try {
      const stored = localStorage.getItem(`kyp_third_parties_${workspaceId}`)
      const existing = stored ? JSON.parse(stored) : []
      localStorage.setItem(
        `kyp_third_parties_${workspaceId}`,
        JSON.stringify([...existing, newThirdParty])
      )
      localStorage.setItem(`kyp_third_party_${newThirdParty.id}`, JSON.stringify(newThirdParty))
      return newThirdParty
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('third_parties')
      .insert([
        {
          workspace_id: workspaceId,
          ...thirdParty
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating third party:', error)
    return null
  }
}

/**
 * Update an existing third party
 */
export const updateThirdParty = async (
  id: string,
  updates: Partial<Omit<ThirdParty, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>
): Promise<ThirdParty | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_third_party_${id}`)
      if (!stored) return null
      
      const existing = JSON.parse(stored)
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      }
      localStorage.setItem(`kyp_third_party_${id}`, JSON.stringify(updated))
      
      // Update in workspace list
      const workspaceStored = localStorage.getItem(`kyp_third_parties_${existing.workspace_id}`)
      if (workspaceStored) {
        const list = JSON.parse(workspaceStored)
        const updatedList = list.map((tp: ThirdParty) => tp.id === id ? updated : tp)
        localStorage.setItem(`kyp_third_parties_${existing.workspace_id}`, JSON.stringify(updatedList))
      }
      
      return updated
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('third_parties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating third party:', error)
    return null
  }
}

/**
 * Delete a third party
 */
export const deleteThirdParty = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_third_party_${id}`)
      if (!stored) return false
      
      const thirdParty = JSON.parse(stored)
      localStorage.removeItem(`kyp_third_party_${id}`)
      
      // Remove from workspace list
      const workspaceStored = localStorage.getItem(`kyp_third_parties_${thirdParty.workspace_id}`)
      if (workspaceStored) {
        const list = JSON.parse(workspaceStored)
        const filtered = list.filter((tp: ThirdParty) => tp.id !== id)
        localStorage.setItem(`kyp_third_parties_${thirdParty.workspace_id}`, JSON.stringify(filtered))
      }
      
      return true
    } catch {
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('third_parties')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting third party:', error)
    return false
  }
}

