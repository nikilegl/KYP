/**
 * Background function for diagram-to-journey (15-minute timeout)
 * Returns immediately with job ID, processes in background, saves to database
 */

const { createClient } = require('@supabase/supabase-js')

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  try {
    console.log('[diagram-to-journey-background] Function invoked')
    
    const { base64Image, prompt, userId } = JSON.parse(event.body || '{}')
    console.log(`[diagram-to-journey-background] Parsed request - userId: ${userId}, imageSize: ${base64Image?.length}, promptSize: ${prompt?.length}`)

    if (!base64Image || !prompt) {
      console.error('[diagram-to-journey-background] Missing required fields')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image and prompt are required' }),
      }
    }

    if (!userId) {
      console.error('[diagram-to-journey-background] Missing userId')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      }
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    
    console.log(`[diagram-to-journey-background] Supabase configured: ${!!supabaseUrl && !!supabaseKey}`)
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[diagram-to-journey-background] Supabase not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase not configured. Check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.' }),
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('ai_processing_jobs')
      .insert({
        user_id: userId,
        job_type: 'diagram',
        status: 'processing',
        input_data: { imageSize: base64Image.length, promptLength: prompt.length }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create processing job' }),
      }
    }

    console.log(`Job ${job.id} created, starting AI processing...`)

    // Process AI request in background
    processInBackground(job.id, base64Image, prompt, supabase)

    // Return immediately with job ID
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        jobId: job.id,
        status: 'processing',
        message: 'Processing started. Poll for results.'
      }),
    }

  } catch (error) {
    console.error('Background function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    }
  }
}

// Process in background (this continues after the 202 response)
async function processInBackground(jobId, base64Image, prompt, supabase) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log(`[Job ${jobId}] Calling OpenAI Vision API...`)
    const startTime = Date.now()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                  detail: 'auto'
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 16384,
        response_format: { type: 'json_object' }
      })
    })

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Job ${jobId}] OpenAI responded in ${processingTime}s`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse the JSON response
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '')
    }

    const journeyData = JSON.parse(cleanContent)

    // Update job with success
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'completed',
        result_data: journeyData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Job ${jobId}] Completed successfully`)

  } catch (error) {
    console.error(`[Job ${jobId}] Failed:`, error)
    
    // Update job with error
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

