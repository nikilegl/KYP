// Test function with a simple diagram prompt (no image)
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
    console.log('Test simple diagram function called')

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      }
    }

    const simplePrompt = `You are analyzing a user journey diagram. Return ONLY valid JSON (no markdown, no explanations).

Output this exact structure:
{
  "name": "Test Journey",
  "description": "Simple test",
  "nodes": [
    {"id": "1", "data": {"label": "Start", "type": "start"}},
    {"id": "2", "data": {"label": "Process", "type": "process"}},
    {"id": "3", "data": {"label": "End", "type": "end"}}
  ],
  "edges": [
    {"source": "1", "target": "2"},
    {"source": "2", "target": "3"}
  ]
}`

    console.log('Making OpenAI API call with diagram prompt...')
    
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
            content: simplePrompt
          },
          {
            role: 'user',
            content: 'Create the test journey as specified.'
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    console.log('OpenAI response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI error:', errorText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `OpenAI API error: ${response.status}` })
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    console.log('OpenAI response received, length:', content?.length)

    // Try to parse JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Could not find JSON in response', raw: content })
      }
    }

    const jsonString = jsonMatch[1] || jsonMatch[0]
    const journey = JSON.parse(jsonString)

    console.log('Successfully parsed journey with', journey.nodes?.length, 'nodes')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        journey: journey,
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

