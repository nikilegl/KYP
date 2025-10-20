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
    const { currentJourney, instruction } = JSON.parse(event.body || '{}')

    if (!currentJourney || !currentJourney.nodes) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Current journey with nodes is required' }),
      }
    }

    if (!instruction || instruction.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Instruction is required' }),
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured.' }),
      }
    }

    console.log('Calling OpenAI API to edit journey...')
    console.log('Instruction:', instruction)
    console.log('Current nodes:', currentJourney.nodes.length)

    const systemPrompt = `You are a user journey editor. You receive a user journey in JSON format and a natural language instruction to modify it.

Your task:
1. Understand the instruction
2. Apply the changes to the journey (nodes, edges, metadata)
3. Return the COMPLETE modified journey as valid JSON

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Include ALL nodes and edges in the response (not just changed ones)
- Maintain the exact structure: nodes with id, type, position, data properties
- Preserve all node properties unless specifically changed by the instruction
- Keep position coordinates as multiples of 8
- If replacing text, update in: node labels, bullet points, thirdPartyName, etc.
- If adding nodes, generate unique IDs and appropriate positions
- If removing nodes, also remove connected edges
- Maintain data structure: userRole, variant, thirdPartyName, bulletPoints, customProperties

Return format (complete journey):
{
  "name": "Journey Name",
  "description": "Journey description",
  "nodes": [...all nodes with any changes applied...],
  "edges": [...all edges with any changes applied...]
}`

    const userPrompt = `Current user journey:
${JSON.stringify(currentJourney, null, 2)}

Instruction: ${instruction}

Apply the instruction and return the COMPLETE modified journey as JSON.`

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000,
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
    const content = data.choices[0].message.content

    let updatedJourney

    try {
      // Remove any markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '')
      }
      
      updatedJourney = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response',
          rawResponse: content.substring(0, 500)
        }),
      }
    }

    // Validate the structure
    if (!updatedJourney.nodes || !Array.isArray(updatedJourney.nodes) || updatedJourney.nodes.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid journey structure: missing or empty nodes',
          data: updatedJourney
        }),
      }
    }

    if (!updatedJourney.edges || !Array.isArray(updatedJourney.edges)) {
      updatedJourney.edges = []
    }

    // Log results
    console.log('Journey edited successfully')
    console.log('Nodes before:', currentJourney.nodes.length, 'after:', updatedJourney.nodes.length)
    console.log('Token usage:', data.usage)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        journey: updatedJourney,
        usage: data.usage,
        finishReason: data.choices[0].finish_reason
      }),
    }

  } catch (error) {
    console.error('Edit journey error:', error)
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

