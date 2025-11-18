/**
 * Force logout utility - clears all authentication sessions
 * This can be used to ensure no users are logged in with old credentials
 */

import { supabase, forceSignOut } from '../lib/supabase'

/**
 * Client-side: Clears all authentication data from browser storage
 * Run this in the browser console or call from code
 */
export const clearAllSessions = async () => {
  console.log('🔴 Clearing all authentication sessions...')
  
  try {
    // Sign out from Supabase if configured
    if (supabase) {
      try {
        await supabase.auth.signOut()
        console.log('✅ Supabase signOut called')
      } catch (error) {
        console.error('Error signing out from Supabase:', error)
      }
    }
    
    // Use the existing forceSignOut function
    await forceSignOut()
    
    // Additional cleanup - clear all localStorage items that might contain auth data
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('sb-') || // Supabase keys
        key.startsWith('supabase.') || // Supabase keys
        key.includes('auth') || // Any auth-related keys
        key.includes('token') || // Any token keys
        key.includes('session') || // Any session keys
        key === 'kyp_local_user' // Local user key
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ Removed: ${key}`)
    })
    
    // Clear all sessionStorage
    sessionStorage.clear()
    console.log('✅ sessionStorage cleared')
    
    // Clear all cookies related to auth (if any)
    document.cookie.split(";").forEach((c) => {
      const cookieName = c.split("=")[0].trim()
      if (cookieName.includes('auth') || cookieName.includes('session') || cookieName.includes('token')) {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
        console.log(`🗑️ Cleared cookie: ${cookieName}`)
      }
    })
    
    console.log('✅ All authentication data cleared!')
    console.log('🔄 Reloading page...')
    
    // Force page reload to ensure clean state
    window.location.reload()
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error clearing sessions:', error)
    return { success: false, error }
  }
}

/**
 * Browser console script - copy and paste this into browser console
 * 
 * (async () => {
 *   console.log('🔴 Force logging out all users...');
 *   const supabase = window.__SUPABASE_CLIENT__ || (await import('/src/lib/supabase.ts')).supabase;
 *   if (supabase) await supabase.auth.signOut();
 *   const keys = [];
 *   for (let i = 0; i < localStorage.length; i++) {
 *     const key = localStorage.key(i);
 *     if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('token') || key.includes('session'))) {
 *       keys.push(key);
 *     }
 *   }
 *   keys.forEach(k => localStorage.removeItem(k));
 *   sessionStorage.clear();
 *   console.log('✅ Cleared', keys.length, 'items. Reloading...');
 *   window.location.reload();
 * })();
 */

