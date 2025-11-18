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
            
            // Check if user was authenticated with email/password (old method)
            // Google OAuth users have app_metadata.provider === 'google'
            const provider = session.user.app_metadata?.provider || session.user.app_metadata?.providers?.[0] || 'email'
            
            if (provider === 'email') {
              console.warn('🔴 User authenticated with email/password (old method) - signing out')
              await supabase.auth.signOut()
              await forceSignOut()
              setUser(null)
              setLoading(false)
              setHasInitialized(true)
              return
            }
            
            console.log('🔵 useAuth: Found Supabase session:', session.user.email, 'Provider:', provider)
            setUser(session.user)
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('🔵 useAuth: Supabase auth state changed:', event, session?.user?.email)
              
              if (session?.user) {
                // Check email domain restriction
                if (!isEmailAllowed(session.user.email)) {
                  console.warn('User email domain not allowed, signing out')
                  await supabase.auth.signOut()
                  setUser(null)
                  setLoading(false)
                  return
                }
                
                // Check if user was authenticated with email/password (old method)
                const provider = session.user.app_metadata?.provider || session.user.app_metadata?.providers?.[0] || 'email'
                
                if (provider === 'email') {
                  console.warn('🔴 User authenticated with email/password (old method) - signing out')
                  await supabase.auth.signOut()
                  await forceSignOut()
                  setUser(null)
                  setLoading(false)
                  return
                }
                
                setUser(session.user)
              } else {
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
    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      // Use current origin (works for both localhost and production)
      const redirectUrl = `${window.location.origin}${window.location.pathname}`
      
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
        console.error('Supabase Google sign in error:', error)
        return { error: { message: error.message || 'Failed to sign in with Google. Please try again.' } }
      }
      
      // The redirect will happen automatically
      // The onAuthStateChange listener will handle the user state update
      return { error: null }
    } catch (error: any) {
      console.error('Google sign in error:', error)
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
