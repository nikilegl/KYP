// Simple test function to verify OpenAI API works
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
    console.log('Test OpenAI function called')

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      }
    }

    console.log('Making OpenAI API call...')
    
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
            content: 'Say "Hello from OpenAI" and nothing else.'
          }
        ],
        max_tokens: 10
      })
    })

    console.log('OpenAI response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI error:', errorText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `OpenAI API error: ${response.status}`, details: errorText })
      }
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || 'No response'

    console.log('OpenAI response:', message)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: message,
        usage: data.usage
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      })
    }
  }
}

