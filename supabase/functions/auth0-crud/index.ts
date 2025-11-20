import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log('🔵 auth0-crud: Edge function invoked:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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

    const { table, operation, data: operationData, where, userEmail, workspaceId } = await req.json()

    if (!table || !operation) {
      return new Response(
        JSON.stringify({ error: 'table and operation are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user has access to workspace
    if (workspaceId && userEmail) {
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

    let result

    switch (operation) {
      case 'insert':
        if (!operationData) {
          return new Response(
            JSON.stringify({ error: 'data is required for insert operation' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        result = await supabaseAdmin
          .from(table)
          .insert(operationData)
          .select()
        break

      case 'update':
        if (!operationData || !where) {
          return new Response(
            JSON.stringify({ error: 'data and where are required for update operation' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        let updateQuery = supabaseAdmin
          .from(table)
          .update(operationData)
        // Apply where conditions
        Object.entries(where).forEach(([key, value]) => {
          updateQuery = updateQuery.eq(key, value)
        })
        result = await updateQuery.select()
        break

      case 'delete':
        if (!where) {
          return new Response(
            JSON.stringify({ error: 'where is required for delete operation' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        let deleteQuery = supabaseAdmin
          .from(table)
          .delete()
        // Apply where conditions
        Object.entries(where).forEach(([key, value]) => {
          deleteQuery = deleteQuery.eq(key, value)
        })
        result = await deleteQuery.select()
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported operation: ${operation}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    if (result.error) {
      console.error('Database error:', result.error)
      return new Response(
        JSON.stringify({ error: result.error.message, details: result.error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result.data 
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






