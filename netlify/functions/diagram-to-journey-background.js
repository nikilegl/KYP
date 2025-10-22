// Background processing for diagram analysis (15-minute timeout)
import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let jobId = null
  let supabase = null

  try {
    const { base64Image, prompt, userId } = JSON.parse(event.body || '{}')

    if (!base64Image || !prompt || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: base64Image, prompt, userId' })
      }
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Create job in Supabase
    const { data: job, error: jobError } = await supabase
      .from('ai_processing_jobs')
      .insert({
        user_id: userId,
        job_type: 'diagram',
        status: 'processing',
        input_data: { imageSize: base64Image.length }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create job' })
      }
    }

    jobId = job.id
    console.log(`[${jobId}] Starting diagram processing`)

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI Vision API
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
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Image, detail: 'auto' } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 16384
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI error:', errorText)
      throw new Error(`OpenAI error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    // Parse JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response')
    }

    const jsonString = jsonMatch[1] || jsonMatch[0]
    const journey = JSON.parse(jsonString)

    // Update job as completed
    const { error: updateError } = await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'completed',
        result_data: journey,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Error updating job:', updateError)
    }

    console.log(`[${jobId}] Completed successfully`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        jobId: jobId
      })
    }

  } catch (error) {
    console.error('Processing error:', error)
    
    // Update job as failed if we have jobId and supabase
    if (jobId && supabase) {
      await supabase
        .from('ai_processing_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        jobId: jobId 
      })
    }
  }
}
