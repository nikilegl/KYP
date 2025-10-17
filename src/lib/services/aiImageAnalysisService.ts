/**
 * AI Image Analysis Service
 * Analyzes user journey diagram images using OpenAI Vision API
 */

export interface JourneyNode {
  id: string
  label: string
  type: 'start' | 'process' | 'end'
  userRole?: string
  platform?: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
  bulletPoints?: string[]
  position: { x: number; y: number }
}

export interface JourneyEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface AnalyzedJourney {
  nodes: JourneyNode[]
  edges: JourneyEdge[]
  name?: string
  description?: string
}

/**
 * Analyzes a user journey diagram image using AI
 */
export async function analyzeJourneyImage(
  imageFile: File,
  apiKey: string
): Promise<AnalyzedJourney> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Updated model with vision capabilities
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: getAnalysisPrompt()
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageFile.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1 // Low temperature for more consistent parsing
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    const parsed = parseAIResponse(content)
    
    // Validate and process the response
    return processJourneyData(parsed)
  } catch (error) {
    console.error('Error analyzing journey image:', error)
    throw error
  }
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // Remove data URL prefix
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Generate the AI prompt for analyzing journey diagrams
 */
function getAnalysisPrompt(): string {
  return `You are analyzing a user journey diagram image. Extract the following information and return it as valid JSON:

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

Extract:
1. **Nodes**: Each box/shape in the diagram representing a step
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - label: The main text/title of the node
   - type: Determine if it's "start" (first step), "process" (middle step), or "end" (final step)
   - userRole: If mentioned, the role performing this step (e.g., "Client", "Developer", "Admin")
   - platform: If mentioned, one of: "CMS", "Legl", "End client", "Back end", "Third party", or empty string
   - bulletPoints: Any bullet points or sub-items listed in the node
   - position: Estimate x,y coordinates based on visual layout (x: horizontal spacing 380-400px apart, y: vertical spacing 240-260px apart for rows)

2. **Edges**: Connections/arrows between nodes
   - id: Generate unique identifier (e.g., "edge-1-2")
   - source: The id of the source node
   - target: The id of the target node
   - label: Any text on or near the arrow/connection

3. **Metadata**:
   - name: Title of the journey if visible
   - description: Any subtitle or description text

Return format:
{
  "name": "Journey Name",
  "description": "Journey description",
  "nodes": [
    {
      "id": "node-1",
      "label": "Node description",
      "type": "start",
      "userRole": "Client",
      "platform": "End client",
      "bulletPoints": ["item 1", "item 2"],
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge-1-2",
      "source": "node-1",
      "target": "node-2",
      "label": "Next step"
    }
  ]
}

Guidelines:
- Read the diagram left-to-right and/or top-to-bottom
- Identify clear start and end points
- Look for role labels like "User", "Client", "Admin", "Developer"
- Look for platform indicators like "CMS", "Backend", "Frontend", "Legl"
- Extract any descriptive text from nodes
- Identify all arrows/lines connecting nodes
- If nodes are in a clear sequence, assign types accordingly (first=start, middle=process, last=end)
- Space nodes evenly: 380-400px horizontally (nodes are 320px wide), 240-260px vertically between rows
- For linear flows: position nodes at x: 100, 480, 860, 1240... (380px spacing)
- For multi-row layouts: use y: 100 for first row, 340 for second row, 580 for third row (240px spacing)

Return ONLY the JSON object, no other text.`
}

/**
 * Parse the AI response text to extract JSON
 */
function parseAIResponse(content: string): any {
  try {
    // Try to parse directly first
    return JSON.parse(content)
  } catch (e) {
    // If direct parse fails, try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    
    // Try to find JSON object in the text
    const objectMatch = content.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0])
    }
    
    throw new Error('Could not parse AI response as JSON')
  }
}

/**
 * Process and validate the journey data
 */
function processJourneyData(data: any): AnalyzedJourney {
  const nodes: JourneyNode[] = (data.nodes || []).map((node: any, index: number) => ({
    id: node.id || `node-${index + 1}`,
    label: node.label || `Node ${index + 1}`,
    type: normalizeNodeType(node.type),
    userRole: node.userRole || undefined,
    platform: normalizePlatform(node.platform),
    bulletPoints: Array.isArray(node.bulletPoints) ? node.bulletPoints.filter((bp: any) => bp) : undefined,
    position: {
      x: typeof node.position?.x === 'number' ? node.position.x : (index % 3) * 380 + 100,
      y: typeof node.position?.y === 'number' ? node.position.y : Math.floor(index / 3) * 240 + 100
    }
  }))

  const edges: JourneyEdge[] = (data.edges || []).map((edge: any, index: number) => ({
    id: edge.id || `edge-${index + 1}`,
    source: edge.source,
    target: edge.target,
    label: edge.label || undefined
  }))

  return {
    nodes,
    edges,
    name: data.name || 'Imported Journey',
    description: data.description || ''
  }
}

/**
 * Normalize node type to valid values
 */
function normalizeNodeType(type: any): 'start' | 'process' | 'end' {
  const typeStr = String(type || '').toLowerCase()
  if (typeStr.includes('start') || typeStr.includes('begin')) return 'start'
  if (typeStr.includes('end') || typeStr.includes('finish')) return 'end'
  return 'process'
}

/**
 * Normalize platform to valid values
 */
function normalizePlatform(platform: any): 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | '' {
  const platformStr = String(platform || '').toLowerCase()
  if (platformStr.includes('cms')) return 'CMS'
  if (platformStr.includes('legl')) return 'Legl'
  if (platformStr.includes('end client') || platformStr.includes('frontend') || platformStr.includes('client')) return 'End client'
  if (platformStr.includes('back end') || platformStr.includes('backend') || platformStr.includes('server')) return 'Back end'
  if (platformStr.includes('third party') || platformStr.includes('3rd party') || platformStr.includes('external')) return 'Third party'
  return ''
}

