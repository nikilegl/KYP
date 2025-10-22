// Process transcript (runs in background)
import { createClient } from '@supabase/supabase-js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 }
  }

  try {
    const { jobId, transcript, prompt } = JSON.parse(event.body || '{}')
    console.log(`[${jobId}] Starting transcript processing`)

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.5,
        max_tokens: 16000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
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
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'completed',
        result_data: journey,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[${jobId}] Completed successfully`)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('Processing error:', error)
    
    // Update job as failed
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
      body: JSON.stringify({ error: error.message })
    }
  }
}

