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
    
    const hasSelection = currentJourney.selectedNodeIds && currentJourney.selectedNodeIds.length > 0
    if (hasSelection) {
      console.log('Selected nodes:', currentJourney.selectedNodeIds)
    } else {
      console.log('No nodes selected - applying to all matching nodes')
    }
    
    const selectionInfo = hasSelection 
      ? `${currentJourney.selectedNodeIds.length} node(s) are SELECTED (IDs: ${currentJourney.selectedNodeIds.join(', ')})` 
      : 'No nodes selected'

    const systemPrompt = `You are a precise user journey editor. Apply the requested changes and return the COMPLETE journey as valid JSON.

CRITICAL RULES:
- Return ONLY valid JSON (no markdown, no explanations)
- Include ALL nodes and edges (even unchanged ones)
- Preserve exact structure: nodes array with id, type, position, data
- Keep position coordinates as multiples of 8
- When replacing text: update labels, bulletPoints, thirdPartyName, variant
- When adding nodes: generate unique IDs (e.g., "node-16", "node-17"), position on grid
- When removing nodes: also remove connected edges
- Preserve all properties not mentioned in the instruction

SELECTION-AWARE EDITING:
- If instruction mentions "selected nodes", ONLY modify nodes where selected=true
- If instruction is general (no mention of "selected"), apply to ALL matching nodes
- When editing selected nodes, preserve the selection state in the response
- Examples:
  * "Update user role of selected nodes to Admin" → only change selected nodes
  * "Change all Fee Earner roles to Admin" → change ALL matching nodes
  * "Replace Amicus with ThirdFort in selected nodes" → only selected nodes

Work efficiently - focus only on what needs to change.`

    const userPrompt = `Journey (${currentJourney.nodes.length} nodes, ${currentJourney.edges.length} edges):
${selectionInfo}
${JSON.stringify(currentJourney, null, 0)}

Instruction: ${instruction}

Return the COMPLETE updated journey as compact JSON.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
        temperature: 0.2,
        max_tokens: 8000,
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

