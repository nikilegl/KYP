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
    console.log('Diagram-to-journey function invoked')
    
    let requestBody
    try {
      requestBody = JSON.parse(event.body || '{}')
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      }
    }

    const { base64Image, prompt } = requestBody

    if (!base64Image || base64Image.trim() === '') {
      console.error('Missing base64Image in request')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data is required' }),
      }
    }

    if (!prompt || prompt.trim() === '') {
      console.error('Missing prompt in request')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your Netlify environment variables.' }),
      }
    }

    console.log('Calling OpenAI Vision API for diagram analysis...')
    console.log('Prompt length:', prompt.length)
    console.log('Image data length:', base64Image.length)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-11-20', // Latest GPT-4 Omni with vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                  detail: 'auto' // Auto: faster processing, OpenAI decides optimal detail
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
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid response structure from OpenAI',
          details: data
        }),
      }
    }
    
    const content = data.choices[0].message.content

    if (!content) {
      console.error('Empty content from OpenAI')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI returned empty content',
          details: data
        }),
      }
    }

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
      console.error('Failed to parse OpenAI response:', parseError.message)
      console.error('Content preview:', content.substring(0, 500))
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response as JSON',
          message: parseError.message,
          contentPreview: content.substring(0, 200)
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

    // Log token usage
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
        nodesExtracted: journeyData.nodes?.length || 0,
        regionsDetected: journeyData.lanes?.length || 0,
        finishReason: data.choices[0].finish_reason
      }),
    }

  } catch (error) {
    console.error('Diagram to journey error:', error)
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

