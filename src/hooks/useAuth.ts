import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, forceSignOut, SupabaseAuthError } from '../lib/supabase'
import { isAuth0Configured } from '../lib/auth0'
import { useAuth0Safe } from './useAuth0Safe'
import type { User } from '@supabase/supabase-js'
import type { Workspace } from '../lib/supabase'

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

// Local storage keys
const LOCAL_USER_KEY = 'kyp_local_user'
const LOCAL_USERS_KEY = 'kyp_local_users'

// Get stored users from localStorage
const getStoredUsers = (): Array<{email: string, password: string}> => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY)
    return stored ? JSON.parse(stored) : [
      { email: 'niki@legl.com', password: 'test1234' }
    ]
  } catch {
    return [{ email: 'niki@legl.com', password: 'test1234' }]
  }
}

// Store users in localStorage
const storeUsers = (users: Array<{email: string, password: string}>) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Failed to store users:', error)
  }
}

// Add user to Legl workspace (works for both Supabase and Auth0 users)
const addUserToLeglWorkspace = async (userId: string, userEmail: string, isAuth0User: boolean = false): Promise<void> => {
  console.log('🔵 addUserToLeglWorkspace: Called with', { userId, userEmail, isAuth0User })
  
  if (isSupabaseConfigured && supabase) {
    try {
      console.log('🔵 addUserToLeglWorkspace: Supabase is configured, proceeding...')
      // First, check if user already exists in any workspace by email
      // This helps us find the correct workspace they should belong to
      const { data: existingUserMembership } = await supabase
        .from('workspace_users')
        .select('workspace_id, workspace:workspaces(id, name)')
        .eq('user_email', userEmail)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      
      let leglWorkspace = null
      
      // If user already exists in a workspace, use that workspace
      if (existingUserMembership?.workspace_id) {
        const workspaceData = existingUserMembership.workspace as any
        // Check if it's the Legl workspace
        if (workspaceData?.name === 'Legl') {
          leglWorkspace = workspaceData
        } else {
          // User is in a different workspace - we'll still add them to Legl
          // but we found their existing workspace
          console.log('User exists in workspace:', workspaceData?.name)
        }
      }
      
      // If we didn't find the user's workspace, or it's not Legl, find/create Legl workspace
      if (!leglWorkspace) {
        // Find the existing 'Legl' workspace
        // Use .order() and .limit() to get the first one if multiple exist
        let { data: leglWorkspaces, error: selectError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('name', 'Legl')
          .order('created_at', { ascending: true })
          .limit(1)
        
        if (selectError && selectError.code !== 'PGRST116') {
          console.error('Error finding Legl workspace:', selectError)
          // If RLS is blocking, try to get all workspaces and filter client-side
          // This is a fallback for Auth0 users who might not pass RLS
          const { data: allWorkspaces } = await supabase
            .from('workspaces')
            .select('*')
          
          if (allWorkspaces) {
            leglWorkspaces = allWorkspaces.filter((w: any) => w.name === 'Legl')
          }
        }
        
        leglWorkspace = leglWorkspaces && leglWorkspaces.length > 0 ? leglWorkspaces[0] : null
        
        if (!leglWorkspace) {
          // Only create if we're sure it doesn't exist
          // Check one more time with a broader query
          const { data: checkWorkspace } = await supabase
            .from('workspaces')
            .select('id, name')
            .eq('name', 'Legl')
            .limit(1)
            .maybeSingle()
          
          if (!checkWorkspace) {
            // Create Legl workspace if it truly doesn't exist
            // For Auth0 users, created_by will be null (which is fine)
            const { data: newWorkspace, error: insertError } = await supabase
              .from('workspaces')
              .insert([{ name: 'Legl', created_by: isAuth0User ? null : userId }])
              .select()
              .maybeSingle()
            
            if (insertError) {
              console.error('Error creating Legl workspace:', insertError)
              // If insert fails due to RLS, the workspace might already exist
              // Try to find it again
              const { data: retryWorkspace } = await supabase
                .from('workspaces')
                .select('*')
                .eq('name', 'Legl')
                .limit(1)
                .maybeSingle()
              
              if (retryWorkspace) {
                leglWorkspace = retryWorkspace
              } else {
                console.error('Unable to create or find Legl workspace')
                return
              }
            } else {
              leglWorkspace = newWorkspace
            }
          } else {
            leglWorkspace = checkWorkspace
          }
        }
      }
      
      if (!leglWorkspace) {
        console.error('Unable to find or create Legl workspace')
        return
      }
      
      // For Auth0 users, look up by email instead of user_id
      // For Supabase users, we can use either email or user_id
      let existingMembership
      
      if (isAuth0User) {
        // Auth0 users: lookup by email only
        const { data } = await supabase
          .from('workspace_users')
          .select('id, user_id, status')
          .eq('workspace_id', leglWorkspace.id)
          .eq('user_email', userEmail)
          .maybeSingle()
        existingMembership = data
      } else {
        // Supabase users: lookup by user_id first, then email as fallback
        const { data } = await supabase
          .from('workspace_users')
          .select('id, user_id, status')
          .eq('workspace_id', leglWorkspace.id)
          .eq('user_id', userId)
          .maybeSingle()
        existingMembership = data
        
        // If not found by user_id, try email
        if (!existingMembership) {
          const { data: emailData } = await supabase
            .from('workspace_users')
            .select('id, user_id, status')
            .eq('workspace_id', leglWorkspace.id)
            .eq('user_email', userEmail)
            .maybeSingle()
          existingMembership = emailData
        }
      }
      
      if (!existingMembership) {
        // Add user to workspace
        const insertData: any = {
          workspace_id: leglWorkspace.id,
          user_email: userEmail,
          role: 'member',
          status: 'active'
        }
        
        // Only add user_id if it's a Supabase user (not Auth0)
        if (!isAuth0User) {
          insertData.user_id = userId
        }
        
        console.log('🔵 addUserToLeglWorkspace: Inserting user with data:', insertData)
        const { data: insertResult, error: insertError } = await supabase
          .from('workspace_users')
          .insert([insertData])
          .select()
        
        if (insertError) {
          console.error('❌ addUserToLeglWorkspace: Error adding user to workspace:', insertError)
          console.error('❌ Error code:', insertError.code)
          console.error('❌ Error message:', insertError.message)
          console.error('❌ Error details:', insertError.details)
          console.error('❌ Error hint:', insertError.hint)
        } else {
          console.log('✅ addUserToLeglWorkspace: Successfully added user to Legl workspace:', userEmail)
          console.log('✅ Insert result:', insertResult)
        }
      } else {
        // Update existing membership to active and set user_id if needed
        const updateData: any = {
          status: 'active',
          updated_at: new Date().toISOString()
        }
        
        // Update user_id if it's a Supabase user and not already set
        if (!isAuth0User && !existingMembership.user_id) {
          updateData.user_id = userId
        }
        
        const { error: updateError } = await supabase
          .from('workspace_users')
          .update(updateData)
          .eq('id', existingMembership.id)
        
        if (updateError) {
          console.error('Error updating workspace user:', updateError)
        } else {
          console.log('Successfully updated workspace user:', userEmail)
        }
      }
    } catch (error) {
      console.error('Error adding user to Legl workspace:', error)
    }
  }
}

// Check if email is allowed (must be @legl.com)
const isEmailAllowed = (email: string | null | undefined): boolean => {
  if (!email) return false
  return email.toLowerCase().endsWith('@legl.com')
}

// Convert Auth0 user to Supabase-compatible User type
const convertAuth0UserToSupabaseUser = (auth0User: any): User | null => {
  if (!auth0User) return null
  
  // Check email domain restriction
  const email = auth0User.email || ''
  if (!isEmailAllowed(email)) {
    console.warn('Access denied: Email must be @legl.com')
    return null
  }
  
  return {
    id: auth0User.sub || auth0User.user_id || '',
    email: email,
    created_at: auth0User.created_at || new Date().toISOString(),
    updated_at: auth0User.updated_at || new Date().toISOString(),
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: auth0User.app_metadata || {},
    user_metadata: auth0User.user_metadata || {}
  }
}

export function useAuth() {
  // Safely get Auth0 hook (returns null if not configured or provider not available)
  const auth0 = useAuth0Safe()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [supabaseInitialized, setSupabaseInitialized] = useState(false)

  // Handle Auth0 authentication
  useEffect(() => {
    if (!isAuth0Configured || !auth0) {
      return
    }

    // Wait for Auth0 to finish loading (checking session from localStorage)
    if (auth0.isLoading) {
      setLoading(true)
      return
    }

    // Auth0 has finished loading - check if user exists
    if (auth0.user) {
      // If user doesn't have allowed email domain, sign them out
      if (!isEmailAllowed(auth0.user.email)) {
        console.warn('User email domain not allowed, signing out')
        auth0.logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
        setUser(null)
        setLoading(false)
        setHasInitialized(true)
        return
      }
      
      const auth0User = convertAuth0UserToSupabaseUser(auth0.user)
      
      // Add Auth0 user to Legl workspace using Edge Function (bypasses RLS)
      if (auth0User && auth0.user.email && isSupabaseConfigured && supabase) {
        console.log('🔵 useAuth: Adding Auth0 user to workspace via Edge Function:', auth0.user.email)
        
        // Use Edge Function to add user (bypasses RLS with service role)
        supabase.functions.invoke('add-auth0-user', {
          body: { 
            email: auth0.user.email, 
            userId: auth0User.id 
          }
        })
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ useAuth: Edge function error:', error)
              // Fallback to direct method if Edge Function fails
              console.log('🔵 useAuth: Falling back to direct method...')
              return addUserToLeglWorkspace(auth0User.id, auth0.user.email, true)
            } else {
              console.log('✅ useAuth: Successfully added Auth0 user via Edge Function:', data)
            }
          })
          .catch(error => {
            console.error('❌ useAuth: Failed to add Auth0 user:', error)
            // Fallback to direct method
            console.log('🔵 useAuth: Falling back to direct method...')
            return addUserToLeglWorkspace(auth0User.id, auth0.user.email, true)
          })
      }
      
      setUser(auth0User)
      setLoading(false)
      setHasInitialized(true)
    } else {
      // No user - user is logged out
      setUser(null)
      setLoading(false)
      setHasInitialized(true)
    }
  }, [auth0?.user, auth0?.isLoading, isAuth0Configured, auth0])

  // Handle Supabase/local authentication (fallback or when Auth0 user not present)
  useEffect(() => {
    // If Auth0 is configured and has a user, skip Supabase auth (Auth0 takes precedence)
    // But if Auth0 is still loading, wait for it to finish
    if (isAuth0Configured) {
      if (auth0?.isLoading) {
        // Still loading, wait
        return
      }
      if (auth0?.user) {
        // Auth0 has a user, skip Supabase
        return
      }
      // Auth0 is configured but no user - allow Supabase auth
    }

    // Prevent re-initialization if Supabase auth has already been initialized
    if (supabaseInitialized) {
      return
    }

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('🔵 useAuth: Found Supabase session:', session.user.email)
            setUser(session.user)
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              console.log('🔵 useAuth: Supabase auth state changed:', event, session?.user?.email)
              // Always update user state from Supabase
              // The Auth0 effect will override if Auth0 has a user (Auth0 takes precedence)
              setUser(session?.user ?? null)
              setLoading(false)
            }
          )

          setLoading(false)
          setHasInitialized(true)
          setSupabaseInitialized(true)
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
          setSupabaseInitialized(true)
        }
      } else {
        initLocalAuth()
      }
    }

    const initLocalAuth = () => {
      console.log('🔵 useAuth: initLocalAuth called')
      try {
        const storedUser = localStorage.getItem(LOCAL_USER_KEY)
        console.log('🔵 useAuth: storedUser from localStorage:', storedUser)
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          console.log('🔵 useAuth: Setting user from localStorage:', parsedUser)
          setUser(parsedUser)
        } else {
          console.log('🔵 useAuth: No stored user found')
        }
      } catch (error) {
        console.error('Failed to load stored user:', error)
      }
      setLoading(false)
      setHasInitialized(true)
      setSupabaseInitialized(true)
    }

    initAuth()
  }, [supabaseInitialized, isAuth0Configured, auth0?.user, auth0?.isLoading])

  const signIn = async (email: string, password: string) => {
    // Check email domain restriction
    if (!isEmailAllowed(email)) {
      return { error: { message: 'Access restricted to @legl.com email addresses only.' } }
    }

    // If Auth0 is configured, still allow Supabase email/password login
    // Auth0 is optional - users can choose Google or email/password

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        // Double-check email domain after successful sign in
        if (data.user && !isEmailAllowed(data.user.email)) {
          await supabase.auth.signOut()
          return { error: { message: 'Access restricted to @legl.com email addresses only.' } }
        }
        
        // Add user to Legl workspace after successful sign in
        if (data.user) {
          await addUserToLeglWorkspace(data.user.id, data.user.email || email)
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase sign in error:', error)
        return { error: { message: 'Failed to sign in. Please try again.' } }
      }
    } else {
      // Local authentication
      const users = getStoredUsers()
      const foundUser = users.find(u => u.email === email && u.password === password)
      
      if (foundUser) {
        const authUser = createMockUser(email)
        setUser(authUser)
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser))
        return { error: null }
      } else {
        return { error: { message: 'Invalid email or password' } }
      }
    }
  }

  const signInWithGoogle = async () => {
    if (isAuth0Configured && auth0) {
      try {
        await auth0.loginWithRedirect({
          authorizationParams: {
            connection: 'google-oauth2',
          },
        })
        return { error: null }
      } catch (error: any) {
        console.error('Auth0 Google sign in error:', error)
        return { error: { message: error.message || 'Failed to sign in with Google. Please try again.' } }
      }
    }
    return { error: { message: 'Auth0 is not configured' } }
  }

  const signUp = async (email: string, password: string) => {
    // Check email domain restriction
    if (!isEmailAllowed(email)) {
      return { error: { message: 'Access restricted to @legl.com email addresses only.' } }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password
        })
        
        if (error) {
          // Handle user already exists error with helpful message
          if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
            return { 
              error: { 
                message: 'An account with this email already exists. If you were invited to join a workspace, please use the Sign In form instead. If you forgot your password, you can reset it using the "Forgot Password" option.' 
              } 
            }
          }
          return { error: { message: error.message } }
        }
        
        // Note: User will be added to Legl workspace when they confirm their email and sign in
        
        return { error: null }
      } catch (error) {
        console.error('Supabase sign up error:', error)
        return { error: { message: 'Failed to create account. Please try again.' } }
      }
    } else {
      // Local authentication
      const users = getStoredUsers()
      
      // Check if user already exists
      if (users.find(u => u.email === email)) {
        return { error: { message: 'User already exists' } }
      }
      
      // Add new user
      users.push({ email, password })
      storeUsers(users)
      
      // Check if user was pre-added to workspace and activate them
      try {
        const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
        const updatedWorkspaceUsers = workspaceUsers.map((wu: any) => 
          wu.user_email === email 
            ? { ...wu, status: 'active', user_id: `user-${Date.now()}`, updated_at: new Date().toISOString() }
            : wu
        )
        localStorage.setItem('kyp_workspace_users', JSON.stringify(updatedWorkspaceUsers))
      } catch (error) {
        console.error('Error updating workspace user status:', error)
      }
      
      return { error: null }
    }
  }

  const signOut = async () => {
    console.log('🔵 useAuth: signOut called')
    
    // Check which authentication method the user is using
    // If Auth0 has a user, sign out from Auth0
    // Otherwise, sign out from Supabase/local
    
    if (isAuth0Configured && auth0?.user) {
      console.log('🔵 useAuth: Using Auth0 signOut')
      try {
        await auth0.logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
        setUser(null)
        setLoading(false)
        return { error: null }
      } catch (error) {
        console.error('Auth0 sign out error:', error)
        // Fall through to clear local state even if Auth0 logout fails
        setUser(null)
        setLoading(false)
        return { error: null }
      }
    }
    
    // Sign out from Supabase if configured
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
      setSupabaseInitialized(false)
      setLoading(false)
      console.log('🔵 useAuth: Supabase user set to null')
      return { error: null }
    } else {
      console.log('🔵 useAuth: Using local signOut')
      // Local authentication - clear localStorage FIRST
      localStorage.removeItem(LOCAL_USER_KEY)
      console.log('🔵 useAuth: localStorage cleared')
      
      // Then set user to null and reset initialization flag
      setUser(null)
      setHasInitialized(false)
      setSupabaseInitialized(false)
      setLoading(false)
      console.log('🔵 useAuth: Local user set to null and hasInitialized reset')
      
      return { error: null }
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase password reset error:', error)
        return { error: { message: 'Failed to send password reset email. Please try again.' } }
      }
    } else {
      // Local authentication - simulate success
      return { error: null }
    }
  }

  const updateUserPassword = async (newPassword: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase password update error:', error)
        return { error: { message: 'Failed to update password. Please try again.' } }
      }
    } else {
      // Local authentication - simulate success
      return { error: null }
    }
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