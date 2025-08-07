import { supabase, isSupabaseConfigured } from '../../supabase'
import type { LawFirm } from '../../supabase'

export const getLawFirms = async (): Promise<LawFirm[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_law_firms')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching law firms:', error)
    return []
  }
}

export const createLawFirm = async (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive'): Promise<LawFirm | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const newLawFirm: LawFirm = {
        id: `firm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        structure,
        status,
        top_4: false,
        quick_facts: '',
        key_quotes: '',
        insights: '',
        opportunities: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      lawFirms.unshift(newLawFirm)
      localStorage.setItem('kyp_law_firms', JSON.stringify(lawFirms))
      return newLawFirm
    } catch (error) {
      console.error('Error creating law firm locally:', error)
      return null
    }
  }

  try {
    // Get the workspace (assuming single workspace for now)
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!workspaces) {
      console.error('No workspace found')
      return null
    }

    const { data, error } = await supabase
      .from('law_firms')
      .insert([{
        workspace_id: workspaces.id,
        name,
        structure,
        status,
        top_4: false
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating law firm:', error)
    return null
  }
}

export const updateLawFirm = async (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>): Promise<LawFirm | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const updatedLawFirms = lawFirms.map((firm: LawFirm) => 
        firm.id === id 
          ? { ...firm, ...updates, updated_at: new Date().toISOString() }
          : firm
      )
      localStorage.setItem('kyp_law_firms', JSON.stringify(updatedLawFirms))
      
      const updatedFirm = updatedLawFirms.find((f: LawFirm) => f.id === id)
      return updatedFirm || null
    } catch (error) {
      console.error('Error updating law firm locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating law firm:', error)
    return null
  }
}

export const deleteLawFirm = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const filteredLawFirms = lawFirms.filter((firm: LawFirm) => firm.id !== id)
      localStorage.setItem('kyp_law_firms', JSON.stringify(filteredLawFirms))
      return true
    } catch (error) {
      console.error('Error deleting law firm locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('law_firms')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting law firm:', error)
    return false
  }
}

export const importLawFirmsFromCSV = async (csvData: string): Promise<{ success: number, errors: string[] }> => {
  const results = { success: 0, errors: [] as string[] }
  
  try {
    const lines = csvData.trim().split('\n')
    const headers = lines[0]?.split(',').map(h => h.trim())
    
    if (!headers || headers.length < 2) {
      results.errors.push('CSV must have at least 2 columns: Name, Structure')
      return results
    }
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        
        if (values.length < 2) {
          results.errors.push(`Row ${i + 1}: Insufficient columns`)
          continue
        }
        
        const [name, structureStr] = values
        
        if (!name) {
          results.errors.push(`Row ${i + 1}: Name is required`)
          continue
        }
        
        const structure = structureStr?.toLowerCase() === 'centralised' ? 'centralised' : 'decentralised'
        
        const lawFirm = await createLawFirm(name, structure, 'active')
        
        if (lawFirm) {
          results.success++
        } else {
          results.errors.push(`Row ${i + 1}: Failed to create law firm`)
        }
        
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
  } catch (error) {
    results.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return results
}

export const deleteAllLawFirms = async (): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      localStorage.setItem('kyp_law_firms', JSON.stringify([]))
      return true
    } catch (error) {
      console.error('Error deleting all law firms locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('law_firms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting all law firms:', error)
    return false
  }
}