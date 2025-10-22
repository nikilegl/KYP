// Start diagram processing job (returns immediately)
import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const { base64Image, prompt, userId } = JSON.parse(event.body || '{}')

    if (!base64Image || !prompt || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

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
        input_data: { imageSize: base64Image.length }
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create job:', createError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create job' })
      }
    }

    // Trigger the actual processing function (don't wait for it)
    fetch(`${process.env.URL}/.netlify/functions/diagram-to-journey-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        base64Image,
        prompt
      })
    }).catch(err => console.error('Failed to trigger processing:', err))

    // Return immediately
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Processing started'
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

