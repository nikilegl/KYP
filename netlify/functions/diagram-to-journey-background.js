// Background function for diagram-to-journey (15 minute timeout)
// Uses ES modules for Netlify compatibility

import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { base64Image, prompt, userId } = JSON.parse(event.body || '{}')

    if (!base64Image || !prompt || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: base64Image, prompt, userId' })
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Create job in database
    const { data: job, error: createError } = await supabase
      .from('ai_processing_jobs')
      .insert({
        user_id: userId,
        job_type: 'diagram',
        status: 'processing',
        input_data: { hasImage: true } // Don't store the actual image
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create job:', createError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create processing job' })
      }
    }

    const jobId = job.id
    console.log(`[${jobId}] Starting diagram processing...`)

    // Process in the same function (background functions have 15min timeout)
    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please analyze this user journey diagram and extract the journey data as JSON.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${jobId}] OpenAI API error:`, errorText)
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not find JSON in AI response')
      }

      const jsonString = jsonMatch[1] || jsonMatch[0]
      const journey = JSON.parse(jsonString)

      console.log(`[${jobId}] Processing completed successfully`)

      // Update job with success
      await supabase
        .from('ai_processing_jobs')
        .update({
          status: 'completed',
          result_data: journey,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true,
          jobId,
          journey 
        })
      }

    } catch (processingError) {
      console.error(`[${jobId}] Processing error:`, processingError)
      
      // Update job with error
      await supabase
        .from('ai_processing_jobs')
        .update({
          status: 'failed',
          error_message: processingError.message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: processingError.message,
          jobId 
        })
      }
    }

  } catch (error) {
    console.error('Background function error:', error)
    console.error('Error stack:', error.stack)
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
