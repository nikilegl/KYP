/**
 * AI Image Analysis Service
 * Analyzes user journey diagram images using OpenAI Vision API
 */

import { generateDiagramToJourneyPrompt } from '../prompts/diagram-to-journey-prompt'

export interface JourneyNotification {
  id: string
  type: 'pain-point' | 'warning' | 'info' | 'positive'
  message: string
}

export interface JourneyNode {
  id: string
  type: 'start' | 'process' | 'end'
  position: { x: number; y: number }
  data: {
    label: string
    type: 'start' | 'process' | 'end'
    userRole?: string
    variant?: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
    thirdPartyName?: string
    bulletPoints?: string[]
    notifications?: JourneyNotification[]
    customProperties?: Record<string, any>
    journeyLayout?: 'vertical' | 'horizontal'
  }
}

export interface JourneyEdge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
  data?: {
    label?: string
  }
}

export interface JourneyRegion {
  id: string
  type: 'highlightRegion'
  position: { x: number; y: number }
  style: {
    width: number
    height: number
    zIndex: number
  }
  data: {
    label: string
    backgroundColor: string
    borderColor: string
  }
  draggable?: boolean
  selectable?: boolean
}

export interface AnalyzedJourney {
  nodes: JourneyNode[]
  edges: JourneyEdge[]
  regions?: JourneyRegion[]
  name?: string
  description?: string
  layout?: 'vertical' | 'horizontal'
}

/**
 * Analyzes a user journey diagram image using AI
 * @param imageFile - The image file to analyze
 * @param apiKey - OpenAI API key
 * @param userRoleNames - Array of available user role names from the workspace
 */
export async function analyzeJourneyImage(
  imageFile: File,
  apiKey: string,
  userRoleNames: string[] = []
): Promise<AnalyzedJourney> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Generate prompt with user roles
    const prompt = generateDiagramToJourneyPrompt(userRoleNames)
    
    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Model with vision capabilities
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
                  url: `data:${imageFile.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 8192, // Increased for more complex responses with regions
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
  // Process regions (if any)
  const regions: JourneyRegion[] = (data.regions || []).map((region: any, index: number) => ({
    id: region.id || `region-${index + 1}`,
    type: 'highlightRegion' as const,
    position: {
      x: snapToGrid(region.position?.x, 15) || 75,
      y: snapToGrid(region.position?.y, 15) || 75
    },
    style: {
      width: snapToGrid(region.style?.width, 15) || 600,
      height: snapToGrid(region.style?.height, 15) || 450,
      zIndex: -1
    },
    data: {
      label: region.data?.label || `Region ${index + 1}`,
      backgroundColor: region.data?.backgroundColor || '#dbeafe',
      borderColor: region.data?.borderColor || '#3b82f6'
    },
    draggable: true,
    selectable: true
  }))

  // Process nodes
  const nodes: JourneyNode[] = (data.nodes || []).map((node: any, index: number) => {
    // Process notifications
    const notifications: JourneyNotification[] = (node.data?.notifications || node.notifications || [])
      .map((notif: any) => ({
        id: notif.id || `notif-${Date.now()}-${Math.random()}`,
        type: normalizeNotificationType(notif.type),
        message: notif.message || ''
      }))
      .filter((notif: JourneyNotification) => notif.message)

    return {
      id: node.id || `node-${index + 1}`,
      type: normalizeNodeType(node.type || node.data?.type),
      position: {
        x: snapToGrid(node.position?.x, 15) || (index % 3) * 375 + 105,
        y: snapToGrid(node.position?.y, 15) || Math.floor(index / 3) * 255 + 105
      },
      data: {
        label: node.data?.label || node.label || `Node ${index + 1}`,
        type: normalizeNodeType(node.type || node.data?.type),
        userRole: node.data?.userRole || node.userRole || undefined,
        variant: normalizeVariant(node.data?.variant || node.platform),
        thirdPartyName: node.data?.thirdPartyName || node.thirdPartyName || '',
        bulletPoints: Array.isArray(node.data?.bulletPoints || node.bulletPoints) 
          ? (node.data?.bulletPoints || node.bulletPoints).filter((bp: any) => bp) 
          : [],
        notifications: notifications.length > 0 ? notifications : [],
        customProperties: node.data?.customProperties || {},
        journeyLayout: data.layout || node.data?.journeyLayout || 'vertical'
      }
    }
  })

  // Process edges
  const edges: JourneyEdge[] = (data.edges || []).map((edge: any, index: number) => ({
    id: edge.id || `edge-${index + 1}`,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'custom',
    label: edge.label || '',
    data: {
      label: edge.data?.label || edge.label || ''
    }
  }))

  return {
    nodes,
    edges,
    regions: regions.length > 0 ? regions : undefined,
    name: data.name || 'Imported Journey',
    description: data.description || '',
    layout: data.layout || 'vertical'
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
 * Normalize variant to valid values
 */
function normalizeVariant(variant: any): 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | '' {
  const variantStr = String(variant || '').toLowerCase()
  if (variantStr.includes('cms')) return 'CMS'
  if (variantStr.includes('legl')) return 'Legl'
  if (variantStr.includes('end client') || variantStr.includes('frontend') || variantStr.includes('client')) return 'End client'
  if (variantStr.includes('back end') || variantStr.includes('backend') || variantStr.includes('server')) return 'Back end'
  if (variantStr.includes('third party') || variantStr.includes('3rd party') || variantStr.includes('external')) return 'Third party'
  return ''
}

/**
 * Normalize notification type to valid values
 */
function normalizeNotificationType(type: any): 'pain-point' | 'warning' | 'info' | 'positive' {
  const typeStr = String(type || '').toLowerCase()
  if (typeStr.includes('pain') || typeStr.includes('problem') || typeStr.includes('issue')) return 'pain-point'
  if (typeStr.includes('warn')) return 'warning'
  if (typeStr.includes('positive') || typeStr.includes('success') || typeStr.includes('good')) return 'positive'
  return 'info'
}

/**
 * Snap a value to the nearest multiple of gridSize
 */
function snapToGrid(value: any, gridSize: number): number {
  const num = typeof value === 'number' ? value : 0
  return Math.round(num / gridSize) * gridSize
}

