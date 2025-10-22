// Background processing for journey editing (15-minute timeout)
import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  console.log('🎯 Edit journey background function triggered')
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  let jobId = null
  let supabase = null

  try {
    const { currentJourney, instruction, userId } = JSON.parse(event.body || '{}')

    if (!currentJourney || !currentJourney.nodes) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Current journey with nodes is required' }),
      }
    }

    if (!instruction || instruction.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Instruction is required' }),
      }
    }

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      }
    }

    // Initialize Supabase client with service role
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create job record in database
    const { data: job, error: createError } = await supabase
      .from('ai_processing_jobs')
      .insert([
        {
          user_id: userId,
          job_type: 'edit-journey',
          status: 'processing',
          input_data: {
            instruction,
            currentJourney: {
              nodesCount: currentJourney.nodes.length,
              edgesCount: currentJourney.edges.length,
              hasSelection: currentJourney.selectedNodeIds && currentJourney.selectedNodeIds.length > 0
            }
          }
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Failed to create job:', createError)
      throw new Error('Failed to create processing job')
    }

    jobId = job.id
    console.log(`✓ Job created: ${jobId}`)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Calling OpenAI API to edit journey...')
    console.log('Instruction:', instruction)
    console.log('Current nodes:', currentJourney.nodes.length)
    
    const hasSelection = currentJourney.selectedNodeIds && currentJourney.selectedNodeIds.length > 0
    if (hasSelection) {
      console.log('Selected nodes:', currentJourney.selectedNodeIds)
    } else {
      console.log('No nodes selected - applying to all matching nodes')
    }
    
    const selectionInfo = hasSelection 
      ? `${currentJourney.selectedNodeIds.length} node(s) are SELECTED (IDs: ${currentJourney.selectedNodeIds.join(', ')})` 
      : 'No nodes selected'

    const systemPrompt = `You are a precise user journey editor. Apply the requested changes and return the COMPLETE journey as valid JSON.

CRITICAL RULES:
- Return ONLY valid JSON (no markdown, no explanations)
- Include ALL nodes and edges (even unchanged ones)
- Preserve exact structure: nodes array with id, type, position, data
- Keep position coordinates as multiples of 8
- When replacing text: update labels, bulletPoints, thirdPartyName, variant
- When adding nodes: generate unique IDs (e.g., "node-16", "node-17"), position on grid
- When removing nodes: also remove connected edges
- Preserve all properties not mentioned in the instruction

SELECTION-AWARE EDITING:
- If instruction mentions "selected nodes", ONLY modify nodes where selected=true
- If instruction is general (no mention of "selected"), apply to ALL matching nodes
- When editing selected nodes, preserve the selection state in the response
- Examples:
  * "Update user role of selected nodes to Admin" → only change selected nodes
  * "Change all Fee Earner roles to Admin" → change ALL matching nodes
  * "Replace Amicus with ThirdFort in selected nodes" → only selected nodes

Work efficiently - focus only on what needs to change.`

    const userPrompt = `Journey (${currentJourney.nodes.length} nodes, ${currentJourney.edges.length} edges):
${selectionInfo}
${JSON.stringify(currentJourney, null, 0)}

Instruction: ${instruction}

Return the COMPLETE updated journey as compact JSON.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    let updatedJourney

    try {
      // Remove any markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '')
      }
      
      updatedJourney = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      throw new Error('Failed to parse AI response')
    }

    // Validate the structure
    if (!updatedJourney.nodes || !Array.isArray(updatedJourney.nodes) || updatedJourney.nodes.length === 0) {
      throw new Error('Invalid journey structure: missing or empty nodes')
    }

    if (!updatedJourney.edges || !Array.isArray(updatedJourney.edges)) {
      updatedJourney.edges = []
    }

    // Log results
    console.log('✓ Journey edited successfully')
    console.log('Nodes before:', currentJourney.nodes.length, 'after:', updatedJourney.nodes.length)
    console.log('Token usage:', data.usage)

    // Update job as completed
    const { error: updateError } = await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'completed',
        result_data: updatedJourney,
        completed_at: new Date().toISOString(),
        metadata: {
          usage: data.usage,
          finishReason: data.choices[0].finish_reason
        }
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Failed to update job as completed:', updateError)
      throw new Error('Failed to update job status')
    }

    console.log(`✓ Job ${jobId} marked as completed`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'Journey editing completed'
      }),
    }

  } catch (error) {
    console.error('❌ Edit journey background error:', error)

    // Try to update job as failed if we have a job ID
    if (jobId && supabase) {
      try {
        await supabase
          .from('ai_processing_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        
        console.log(`✓ Job ${jobId} marked as failed`)
      } catch (updateError) {
        console.error('Failed to update job as failed:', updateError)
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        jobId
      }),
    }
  }
}

