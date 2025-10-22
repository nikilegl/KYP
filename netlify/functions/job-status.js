// Check job status
import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const jobId = event.queryStringParameters?.jobId

    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data: job, error } = await supabase
      .from('ai_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      }
    }

    // Return job status
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: job.status,
        result: job.result_data,
        error: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at
      })
    }

  } catch (error) {
    console.error('Error checking job status:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

