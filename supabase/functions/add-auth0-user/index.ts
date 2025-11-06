import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the service role client (bypasses RLS)
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

    const { email, userId } = await req.json()

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find or create the 'Legl' workspace
    let { data: leglWorkspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('name', 'Legl')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (workspaceError && workspaceError.code !== 'PGRST116') {
      console.error('Error finding Legl workspace:', workspaceError)
      return new Response(
        JSON.stringify({ error: 'Failed to find workspace' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create workspace if it doesn't exist
    if (!leglWorkspace) {
      const { data: newWorkspace, error: createError } = await supabaseAdmin
        .from('workspaces')
        .insert([{ name: 'Legl', created_by: null }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating Legl workspace:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create workspace' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      leglWorkspace = newWorkspace
    }

    // Check if user already exists in workspace
    const { data: existingUser } = await supabaseAdmin
      .from('workspace_users')
      .select('*')
      .eq('workspace_id', leglWorkspace.id)
      .eq('user_email', email)
      .maybeSingle()

    if (existingUser) {
      // Update existing user to active if needed
      if (existingUser.status !== 'active') {
        const { error: updateError } = await supabaseAdmin
          .from('workspace_users')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)

        if (updateError) {
          console.error('Error updating workspace user:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update user' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: existingUser,
          workspace: leglWorkspace,
          message: 'User already exists in workspace' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Add user to workspace
    const { data: workspaceUser, error: insertError } = await supabaseAdmin
      .from('workspace_users')
      .insert([{
        workspace_id: leglWorkspace.id,
        user_email: email,
        role: 'member',
        status: 'active'
        // Note: user_id is null for Auth0 users since they don't exist in Supabase auth
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error adding user to workspace:', insertError)
      return new Response(
        JSON.stringify({ error: `Failed to add user: ${insertError.message}` }),
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
        workspace: leglWorkspace,
        message: 'User added to workspace successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

