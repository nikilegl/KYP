/**
 * Get the current user ID from Supabase Auth
 * 
 * Returns the Supabase user ID (UUID string) for authenticated users.
 * This function should be used when you need to track which user created/updated a record.
 */

import { supabase, isSupabaseConfigured } from '../supabase'

/**
 * Get current user ID synchronously (for use in React components)
 * Returns null if user is not authenticated
 */
export const getCurrentUserIdSync = (user: { id: string } | null): string | null => {
  if (!user) return null
  return user.id
}

/**
 * Get current user ID asynchronously (for use in service functions)
 * Returns the Supabase user ID from the current session
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.warn('Error getting Supabase user:', error)
      return null
    }
    
    if (user) {
      return user.id
    }
    
    return null
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Get current user ID from a user object
 * This is the preferred method - pass the user from useAuth hook
 */
export const getUserIdFromUser = (user: { id: string } | null | undefined): string | null => {
  if (!user) return null
  return user.id
}

