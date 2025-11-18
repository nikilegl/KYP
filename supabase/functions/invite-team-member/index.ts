import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteRequest {
  email: string
  role: 'admin' | 'member'
  fullName?: string
  team?: 'Design' | 'Product' | 'Engineering' | 'Other'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, role, fullName, team }: InviteRequest = await req.json()

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Role must be either "admin" or "member"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate team if provided
    if (team && !['Design', 'Product', 'Engineering', 'Other'].includes(team)) {
      return new Response(
        JSON.stringify({ error: 'Team must be one of: Design, Product, Engineering, Other' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the current user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the current user's session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the workspace (assuming single workspace for now)
    const { data: workspaces, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    if (workspaceError || !workspaces) {
      return new Response(
        JSON.stringify({ error: 'No workspace found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already exists in workspace
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('workspace_users')
      .select('id, status')
      .eq('workspace_id', workspaces.id)
      .eq('user_email', email)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking existing user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User already exists in workspace' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Invite user via Supabase Auth
    // Note: Since we use Google OAuth only, users will sign in with Google and be auto-added to workspace
    // The redirectTo is set to home page where they can sign in with Google
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/`,
      data: {
        workspace_id: workspaces.id,
        role: role
      }
    })

    if (inviteError) {
      console.error('Error inviting user:', inviteError)
      return new Response(
        JSON.stringify({ error: `Failed to send invitation: ${inviteError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create workspace user entry
    const { data: workspaceUser, error: workspaceUserError } = await supabaseAdmin
      .from('workspace_users')
      .insert([{
        workspace_id: workspaces.id,
        user_email: email,
        full_name: fullName || null,
        team: team || null,
        role: role,
        invited_by: user.id,
        status: 'pending'
      }])
      .select()
      .single()

    if (workspaceUserError) {
      console.error('Error creating workspace user:', workspaceUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to create workspace user entry' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: workspaceUser,
        message: `Invitation sent to ${email}` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})