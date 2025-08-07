import { supabase, isSupabaseConfigured } from '../../supabase'
import type { NoteTemplate } from '../../supabase'

export const getNoteTemplates = async (): Promise<NoteTemplate[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_note_templates')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('note_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching note templates:', error)
    return []
  }
}

export const getNoteTemplateById = async (id: string): Promise<NoteTemplate | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_note_templates')
      const templates = stored ? JSON.parse(stored) : []
      return templates.find((template: NoteTemplate) => template.id === id) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('note_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching note template by ID:', error)
    return null
  }
}

export const createNoteTemplate = async (name: string, body?: string): Promise<NoteTemplate | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const templates = JSON.parse(localStorage.getItem('kyp_note_templates') || '[]')
      const newTemplate: NoteTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        body: body || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      templates.unshift(newTemplate)
      localStorage.setItem('kyp_note_templates', JSON.stringify(templates))
      return newTemplate
    } catch (error) {
      console.error('Error creating note template locally:', error)
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
      .from('note_templates')
      .insert([{
        workspace_id: workspaces?.id || null,
        name,
        body: body || ''
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating note template:', error)
    return null
  }
}

export const updateNoteTemplate = async (id: string, updates: { name?: string; body?: string }): Promise<NoteTemplate | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const templates = JSON.parse(localStorage.getItem('kyp_note_templates') || '[]')
      const updatedTemplates = templates.map((template: NoteTemplate) => 
        template.id === id 
          ? { ...template, ...updates, updated_at: new Date().toISOString() }
          : template
      )
      localStorage.setItem('kyp_note_templates', JSON.stringify(updatedTemplates))
      
      const updatedTemplate = updatedTemplates.find((t: NoteTemplate) => t.id === id)
      return updatedTemplate || null
    } catch (error) {
      console.error('Error updating note template locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('note_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating note template:', error)
    return null
  }
}

export const deleteNoteTemplate = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const templates = JSON.parse(localStorage.getItem('kyp_note_templates') || '[]')
      const filteredTemplates = templates.filter((template: NoteTemplate) => template.id !== id)
      localStorage.setItem('kyp_note_templates', JSON.stringify(filteredTemplates))
      return true
    } catch (error) {
      console.error('Error deleting note template locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('note_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting note template:', error)
    return false
  }
}