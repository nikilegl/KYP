import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('🔵 get-workspace-data: Edge function invoked:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔵 get-workspace-data: Handling OPTIONS preflight request')
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Get the service role client (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { workspaceId, userEmail } = await req.json()

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user has access to this workspace
    if (userEmail) {
      const { data: workspaceUser } = await supabaseAdmin
        .from('workspace_users')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_email', userEmail)
        .eq('status', 'active')
        .maybeSingle()

      if (!workspaceUser) {
        return new Response(
          JSON.stringify({ error: 'User does not have access to this workspace' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Get user ID from workspace_users for filtering user journeys
    let userId: string | null = null
    if (userEmail) {
      const { data: workspaceUser } = await supabaseAdmin
        .from('workspace_users')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('user_email', userEmail)
        .maybeSingle()
      userId = workspaceUser?.user_id || null
    }

    // First get project IDs for this workspace
    const { data: workspaceProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)
    
    const projectIds = workspaceProjects?.map(p => p.id) || []

    // Fetch all workspace data
    const [
      projects, 
      stakeholders, 
      notes, 
      lawFirms, 
      userStories, 
      designs,
      userRoles,
      userPermissions,
      platforms,
      themes,
      noteTemplates,
      userJourneys
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('stakeholders').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('research_notes').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('law_firms').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('user_stories').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('designs').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('user_roles').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('user_permissions').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('platforms').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('themes').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabaseAdmin.from('note_templates').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      // User journeys: get all for projects in this workspace
      projectIds.length > 0
        ? supabaseAdmin.from('user_journeys').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null })
    ])

    // Filter user journeys: show published to all, drafts only to creator
    let filteredUserJourneys = userJourneys.data || []
    if (userId) {
      // For Auth0 users, userId is null, so show all published journeys
      filteredUserJourneys = filteredUserJourneys.filter((journey: any) => {
        if (journey.status === 'published') return true
        if (journey.status === 'draft') return journey.created_by === userId
        return true // No status = show all
      })
    } else {
      // Auth0 user: show all published, filter drafts by email match in created_by
      filteredUserJourneys = filteredUserJourneys.filter((journey: any) => {
        if (journey.status === 'published') return true
        // For Auth0 users, created_by might be the Auth0 user ID (google-oauth2|...)
        // We can't match it perfectly, so show all for now
        return true
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          projects: projects.data || [],
          stakeholders: stakeholders.data || [],
          notes: notes.data || [],
          lawFirms: lawFirms.data || [],
          userStories: userStories.data || [],
          designs: designs.data || [],
          userRoles: userRoles.data || [],
          userPermissions: userPermissions.data || [],
          platforms: platforms.data || [],
          themes: themes.data || [],
          noteTemplates: noteTemplates.data || [],
          userJourneys: filteredUserJourneys
        }
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

