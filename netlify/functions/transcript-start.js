// Start transcript processing (returns immediately)
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

  try {
    const { transcript, prompt, userId } = JSON.parse(event.body || '{}')

    if (!transcript || !prompt || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: transcript, prompt, userId' })
      }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Create job
    const { data: job, error: createError } = await supabase
      .from('ai_processing_jobs')
      .insert({
        user_id: userId,
        job_type: 'transcript',
        status: 'processing',
        input_data: { transcriptLength: transcript.length, prompt }
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

    // Trigger processing in background (don't wait)
    const processUrl = `${process.env.URL || 'https://kyp-legl.netlify.app'}/.netlify/functions/transcript-process`
    
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        transcript,
        prompt
      })
    }).catch(err => {
      console.error('Failed to trigger processing:', err)
      // Update job as failed
      supabase
        .from('ai_processing_jobs')
        .update({ 
          status: 'failed', 
          error_message: 'Failed to start processing',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .then()
    })

    // Return immediately
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        jobId: job.id,
        status: 'processing'
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

