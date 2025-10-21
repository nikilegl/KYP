/**
 * AI Image Analysis Service
 * Analyzes user journey diagram images using OpenAI Vision API
 */

import { generateDiagramToJourneyPrompt } from '../prompts/diagram-to-journey-prompt'
import { calculateHorizontalJourneyLayout } from './horizontalJourneyLayoutCalculator'

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
        model: 'gpt-4o-2024-11-20', // Latest GPT-4 Omni with vision (November 2024 version)
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
        max_tokens: 16384, // Increased for complex swim lane diagrams
        temperature: 0.2 // Slightly higher for better spatial reasoning while maintaining consistency
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
 * 
 * SEPARATION OF CONCERNS:
 * - AI Prompt: Extracts CONTENT (labels, types, roles, platforms, lanes, edges, notifications)
 * - Layout Calculator: Computes POSITIONS (x, y coordinates based on edges and lanes)
 * - This Function: Combines both to create the final journey structure
 */
function processJourneyData(data: any): AnalyzedJourney {
  const detectedLayout = data.layout || 'horizontal'
  
  // --- Step 1: Extract content from AI (NO POSITIONS) ---
  const rawNodes = (data.nodes || []).map((node: any) => ({
    id: node.id,
    label: node.label,
    type: node.type,
    swimLane: node.laneName, // Use laneName from AI as swimLane identifier
    laneIndex: node.laneIndex,
    laneName: node.laneName,
    userRole: node.userRole,
    platform: node.platform,
    thirdPartyName: node.thirdPartyName,
    bulletPoints: node.bulletPoints || [],
    notifications: node.notifications || []
  }))

  // --- Step 2: Calculate positions based on edges and lanes ---
  // Horizontal layout calculator is the ONLY source of position calculations
  const layoutResult = calculateHorizontalJourneyLayout(
    rawNodes,
    data.edges || []
  )

  // --- Step 3: Process lanes into regions using calculated dimensions ---
  // Constants must match horizontalJourneyLayoutCalculator.ts
  const VERTICAL_GAP_BETWEEN_LANES = 24
  const START_Y = 40
  const calculatedSwimLaneHeight = layoutResult.swimLaneHeight || 300
  const calculatedSwimLaneWidth = layoutResult.swimLaneWidth || 2000
  
  const regions: JourneyRegion[] = (data.lanes || []).map((lane: any) => {
    // Calculate region Y position with gaps (matching layout calculator logic)
    const regionY = START_Y + (lane.index * (calculatedSwimLaneHeight + VERTICAL_GAP_BETWEEN_LANES))
    
    return {
      id: `region-${lane.index}`,
      type: 'highlightRegion' as const,
      position: {
        x: 0,
        y: regionY
      },
      style: {
        width: calculatedSwimLaneWidth,
        height: calculatedSwimLaneHeight,
        zIndex: -1
      },
      data: {
        label: lane.label || `Lane ${lane.index + 1}`,
        backgroundColor: getLaneColor(lane.index).bg,
        borderColor: getLaneColor(lane.index).border
      },
      draggable: true,
      selectable: true
    }
  })

  // --- Step 4: Process nodes with positions from layout calculator ---
  const nodes: JourneyNode[] = layoutResult.nodes.map((node: any) => {
    // Process notifications
    const notifications: JourneyNotification[] = (node.data?.notifications || node.notifications || [])
      .map((notif: any) => ({
        id: notif.id || `notif-${Date.now()}-${Math.random()}`,
        type: normalizeNotificationType(notif.type),
        message: notif.message || ''
      }))
      .filter((notif: JourneyNotification) => notif.message)

    return {
      id: node.id,
      type: normalizeNodeType(node.type || node.data?.type),
      position: node.position, // Use calculated position from layout calculator
      data: {
        label: node.data?.label || node.label || node.id,
        type: normalizeNodeType(node.type || node.data?.type),
        userRole: node.data?.userRole || node.userRole || undefined,
        variant: normalizeVariant(node.data?.variant || node.platform),
        thirdPartyName: node.data?.thirdPartyName || node.thirdPartyName || '',
        bulletPoints: Array.isArray(node.data?.bulletPoints || node.bulletPoints) 
          ? (node.data?.bulletPoints || node.bulletPoints).filter((bp: any) => bp) 
          : [],
        notifications: notifications.length > 0 ? notifications : [],
        customProperties: node.data?.customProperties || {},
        journeyLayout: detectedLayout,
        laneName: node.laneName // Pass through the lane name from AI
      }
    }
  })

  // --- Step 5: Process edges (from AI data, not layout calculator) ---
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
    layout: detectedLayout
  }
}

/**
 * Get lane color based on index (cycle through colors)
 */
function getLaneColor(index: number): { bg: string; border: string } {
  const colors = [
    { bg: '#fef3c7', border: '#f59e0b' }, // Yellow/Amber
    { bg: '#dbeafe', border: '#3b82f6' }, // Blue
    { bg: '#e9d5ff', border: '#a855f7' }, // Purple
    { bg: '#d1fae5', border: '#10b981' }, // Green
    { bg: '#fce7f3', border: '#ec4899' }, // Pink
    { bg: '#e0e7ff', border: '#6366f1' }, // Indigo
  ]
  return colors[index % colors.length]
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

