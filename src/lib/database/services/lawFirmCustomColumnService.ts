import { supabase, isSupabaseConfigured } from '../../supabase'

export interface LawFirmCustomColumn {
  id: string
  workspace_id: string
  column_key: string
  column_name: string
  column_type: 'boolean' | 'string'
  display_order: number
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface LawFirmCustomValues {
  id: string
  law_firm_id: string
  workspace_id: string
  custom_values: Record<string, boolean | string>
  created_at: string
  updated_at: string
}

/**
 * Get all custom columns for a workspace
 */
export const getLawFirmCustomColumns = async (workspaceId: string): Promise<LawFirmCustomColumn[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('law_firm_custom_columns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching law firm custom columns:', error)
    return []
  }
}

/**
 * Create a new custom column
 */
export const createLawFirmCustomColumn = async (
  workspaceId: string,
  columnName: string,
  columnType: 'boolean' | 'string',
  displayOrder: number,
  isRequired: boolean = false
): Promise<LawFirmCustomColumn | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  try {
    // Generate a unique column_key
    const columnKey = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { data, error } = await supabase
      .from('law_firm_custom_columns')
      .insert({
        workspace_id: workspaceId,
        column_key: columnKey,
        column_name: columnName,
        column_type: columnType,
        display_order: displayOrder,
        is_required: isRequired
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating law firm custom column:', error)
    return null
  }
}

/**
 * Update a custom column
 */
export const updateLawFirmCustomColumn = async (
  columnId: string,
  updates: {
    column_name?: string
    column_type?: 'boolean' | 'string'
    display_order?: number
    is_required?: boolean
  }
): Promise<LawFirmCustomColumn | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('law_firm_custom_columns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', columnId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating law firm custom column:', error)
    return null
  }
}

/**
 * Delete a custom column
 */
export const deleteLawFirmCustomColumn = async (columnId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    return false
  }

  try {
    // First, get the column to find its column_key
    const { data: column } = await supabase
      .from('law_firm_custom_columns')
      .select('column_key, workspace_id')
      .eq('id', columnId)
      .single()

    if (!column) return false

    // Delete all custom values for this column across all law firms in the workspace
    const { data: customValues } = await supabase
      .from('law_firm_custom_values')
      .select('id, custom_values')
      .eq('workspace_id', column.workspace_id)

    if (customValues) {
      // Remove the column from all custom_values JSONB objects
      for (const cv of customValues) {
        const updatedValues = { ...cv.custom_values }
        delete updatedValues[column.column_key]
        
        await supabase
          .from('law_firm_custom_values')
          .update({ custom_values: updatedValues })
          .eq('id', cv.id)
      }
    }

    // Delete the column definition
    const { error } = await supabase
      .from('law_firm_custom_columns')
      .delete()
      .eq('id', columnId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting law firm custom column:', error)
    return false
  }
}

/**
 * Reorder custom columns
 */
export const reorderLawFirmCustomColumns = async (
  columnOrders: Array<{ id: string; display_order: number }>
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    return false
  }

  try {
    // Update all columns in a transaction-like manner
    const updates = columnOrders.map(({ id, display_order }) =>
      supabase
        .from('law_firm_custom_columns')
        .update({ display_order, updated_at: new Date().toISOString() })
        .eq('id', id)
    )

    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('Error reordering law firm custom columns:', error)
    return false
  }
}

/**
 * Get custom values for a law firm
 */
export const getLawFirmCustomValues = async (lawFirmId: string): Promise<Record<string, boolean | string> | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('law_firm_custom_values')
      .select('custom_values')
      .eq('law_firm_id', lawFirmId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found, return empty object
        return {}
      }
      throw error
    }
    return data?.custom_values || {}
  } catch (error) {
    console.error('Error fetching law firm custom values:', error)
    return null
  }
}

/**
 * Set custom values for a law firm
 */
export const setLawFirmCustomValues = async (
  lawFirmId: string,
  workspaceId: string,
  customValues: Record<string, boolean | string>
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    return false
  }

  try {
    // Check if custom values record exists
    const { data: existing } = await supabase
      .from('law_firm_custom_values')
      .select('id')
      .eq('law_firm_id', lawFirmId)
      .single()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('law_firm_custom_values')
        .update({
          custom_values: customValues,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Create new record
      const { error } = await supabase
        .from('law_firm_custom_values')
        .insert({
          law_firm_id: lawFirmId,
          workspace_id: workspaceId,
          custom_values: customValues
        })

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Error setting law firm custom values:', error)
    return false
  }
}

