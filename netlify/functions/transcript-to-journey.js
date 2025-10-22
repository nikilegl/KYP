export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle preflight
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
    const { transcript, prompt } = JSON.parse(event.body || '{}')

    if (!transcript || transcript.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Transcript is required' }),
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' }),
      }
    }

    console.log('Calling OpenAI API...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a user journey mapping expert. You extract COMPLETE user journeys from transcripts and return valid JSON only. Extract EVERY step mentioned in the transcript, no matter how long. Never include markdown code blocks or explanations. Be thorough and comprehensive.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nTranscript:\n${transcript}\n\nIMPORTANT: Extract ALL steps from this transcript. Do not truncate or summarize - include every single step mentioned.`
          }
        ],
        temperature: 0.5,
        max_tokens: 16000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API error',
          details: errorData
        }),
      }
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    let journeyData

    try {
      // Remove any markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '')
      }
      
      journeyData = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response',
          rawResponse: content
        }),
      }
    }

    // Validate the structure
    if (!journeyData.nodes || !Array.isArray(journeyData.nodes) || journeyData.nodes.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid journey structure: missing or empty nodes',
          data: journeyData
        }),
      }
    }

    if (!journeyData.edges || !Array.isArray(journeyData.edges)) {
      journeyData.edges = []
    }

    // Log token usage and check if we hit limits
    console.log('Token usage:', data.usage)
    console.log('Nodes extracted:', journeyData.nodes.length)
    if (data.choices[0].finish_reason === 'length') {
      console.warn('WARNING: Response was truncated due to max_tokens limit!')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        journey: journeyData,
        usage: data.usage,
        nodesExtracted: journeyData.nodes.length,
        finishReason: data.choices[0].finish_reason
      }),
    }

  } catch (error) {
    console.error('Transcript to journey error:', error)
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

