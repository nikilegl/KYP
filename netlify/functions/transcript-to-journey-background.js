// Background function for transcript-to-journey (15 minute timeout)
// Uses CommonJS format for Netlify compatibility

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { transcript, prompt, userId } = JSON.parse(event.body || '{}')

    if (!transcript || !prompt || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: transcript, prompt, userId' })
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
        job_type: 'transcript',
        status: 'processing',
        input_data: { transcriptLength: transcript.length }
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
    console.log(`[${jobId}] Starting transcript processing...`)

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
              content: transcript
            }
          ],
          temperature: 0.7,
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
