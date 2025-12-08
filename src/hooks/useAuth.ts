import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, forceSignOut, SupabaseAuthError } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// Mock user for local development
const createMockUser = (email: string): User => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {}
})

// Local storage keys (kept for backward compatibility, but not used)
const LOCAL_USER_KEY = 'kyp_local_user'
// LOCAL_USERS_KEY removed - no longer storing user credentials

// Local authentication is no longer supported - Google OAuth only

// Check if email is allowed (must be @legl.com)
const isEmailAllowed = (email: string | null | undefined): boolean => {
  if (!email) return false
  return email.toLowerCase().endsWith('@legl.com')
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Handle Supabase authentication
  useEffect(() => {
    if (hasInitialized) {
      return
    }

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Check email domain restriction
            if (!isEmailAllowed(session.user.email)) {
              console.warn('User email domain not allowed, signing out')
              await supabase.auth.signOut()
              setUser(null)
              setLoading(false)
              setHasInitialized(true)
              return
            }
            
            console.log('🔵 useAuth: Found Supabase session:', session.user.email)
            setUser(session.user)
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('🔵 SIGNUP_DEBUG: Auth state changed:', event, session?.user?.email)
              
              if (session?.user) {
                console.log('🔵 SIGNUP_DEBUG: User session found:', {
                  id: session.user.id,
                  email: session.user.email,
                  created_at: session.user.created_at
                })
                
                // Check email domain restriction
                if (!isEmailAllowed(session.user.email)) {
                  console.warn('🔵 SIGNUP_DEBUG: User email domain not allowed, signing out')
                  await supabase.auth.signOut()
                  setUser(null)
                  setLoading(false)
                  return
                }
                
                console.log('🔵 SIGNUP_DEBUG: Email domain allowed, checking workspace_users...')
                
                // Check if user is in workspace_users (this happens via trigger)
                try {
                  const { data: workspaceUser, error: workspaceError } = await supabase
                    .from('workspace_users')
                    .select('*')
                    .or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`)
                    .limit(1)
                  
                  if (workspaceError) {
                    console.error('🔵 SIGNUP_DEBUG: Error checking workspace_users:', workspaceError)
                  } else if (workspaceUser && workspaceUser.length > 0) {
                    console.log('🔵 SIGNUP_DEBUG: ✅ User found in workspace_users:', workspaceUser[0])
                  } else {
                    console.warn('🔵 SIGNUP_DEBUG: ⚠️ User NOT found in workspace_users yet. This might indicate the trigger failed.')
                    console.warn('🔵 SIGNUP_DEBUG: User ID:', session.user.id, 'Email:', session.user.email)
                    
                    // Wait a bit and check again (trigger might be delayed)
                    setTimeout(async () => {
                      const { data: retryCheck } = await supabase
                        .from('workspace_users')
                        .select('*')
                        .or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`)
                        .limit(1)
                      
                      if (retryCheck && retryCheck.length > 0) {
                        console.log('🔵 SIGNUP_DEBUG: ✅ User found in workspace_users after retry:', retryCheck[0])
                      } else {
                        console.error('🔵 SIGNUP_DEBUG: ❌ User still NOT in workspace_users after retry. Trigger may have failed.')
                      }
                    }, 2000)
                  }
                } catch (error) {
                  console.error('🔵 SIGNUP_DEBUG: Exception checking workspace_users:', error)
                }
                
                setUser(session.user)
              } else {
                console.log('🔵 SIGNUP_DEBUG: No user session')
                setUser(null)
              }
              
              setLoading(false)
            }
          )

          setLoading(false)
          setHasInitialized(true)
          return () => subscription.unsubscribe()
        } catch (error) {
          if (error instanceof SupabaseAuthError) {
            console.warn('Authentication session expired, user will be signed out')
          } else {
            console.error('Supabase auth error:', error)
          }
          setUser(null)
          setLoading(false)
          setHasInitialized(true)
        }
      } else {
        // Supabase is required - no local fallback
        console.warn('Supabase is not configured. Google OAuth authentication is required.')
        setLoading(false)
        setHasInitialized(true)
      }
    }

    initAuth()
  }, [hasInitialized])

  const signIn = async (email: string, password: string) => {
    // Email/password authentication is no longer supported
    return { error: { message: 'Email/password authentication is not available. Please use Google Sign-In.' } }
  }

  const signInWithGoogle = async () => {
    console.log('🔵 SIGNUP_DEBUG: signInWithGoogle called')
    
    if (!isSupabaseConfigured || !supabase) {
      console.error('🔵 SIGNUP_DEBUG: Supabase not configured')
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      // Use current origin (works for both localhost and production)
      const redirectUrl = `${window.location.origin}${window.location.pathname}`
      console.log('🔵 SIGNUP_DEBUG: Redirect URL:', redirectUrl)
      
      console.log('🔵 SIGNUP_DEBUG: Initiating Google OAuth...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      
      if (error) {
        console.error('🔵 SIGNUP_DEBUG: Supabase Google sign in error:', error)
        return { error: { message: error.message || 'Failed to sign in with Google. Please try again.' } }
      }
      
      console.log('🔵 SIGNUP_DEBUG: OAuth redirect initiated successfully')
      // The redirect will happen automatically
      // The onAuthStateChange listener will handle the user state update
      return { error: null }
    } catch (error: any) {
      console.error('🔵 SIGNUP_DEBUG: Google sign in exception:', error)
      return { error: { message: error.message || 'Failed to sign in with Google. Please try again.' } }
    }
  }

  const signUp = async (email: string, password: string) => {
    // Email/password signup is no longer supported
    return { error: { message: 'Email/password signup is not available. Please use Google Sign-In.' } }
  }

  const signOut = async () => {
    console.log('🔵 useAuth: signOut called')
    
    if (isSupabaseConfigured && supabase) {
      console.log('🔵 useAuth: Using Supabase signOut')
      try {
        // Sign out from Supabase
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Supabase signOut error:', error)
      }
      // Use forceSignOut to aggressively clear session
      await forceSignOut()
      setUser(null)
      setLoading(false)
      console.log('🔵 useAuth: Supabase user set to null')
      return { error: null }
    } else {
      // No local authentication fallback
      setUser(null)
      setLoading(false)
      return { error: null }
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    // Password reset is no longer supported - Google OAuth only
    return { error: { message: 'Password reset is not available. Please use Google Sign-In.' } }
  }

  const updateUserPassword = async (newPassword: string) => {
    // Password update is no longer supported - Google OAuth only
    return { error: { message: 'Password update is not available. Please use Google Sign-In.' } }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    sendPasswordResetEmail,
    updateUserPassword
  }
}
