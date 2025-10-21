import { supabase } from './supabase'

export interface ExtractedExample {
  actor: string
  goal: string
  entry_point: string
  actions: string
  error: string
  outcome: string
}

export interface AIAnalysisResult {
  examples: ExtractedExample[]
  confidence: number
  processingTime: number
}

/**
 * Analyzes a screenshot of a Miro board to extract user journey examples
 * Only extracts data that is actually visible in the screenshot - no hallucination
 * @param base64Image - Base64 encoded image data
 * @returns Promise<AIAnalysisResult> - Extracted examples with confidence score
 */
export const analyzeScreenshot = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    // For now, we'll use a mock implementation
    // TODO: Integrate with actual AI vision service (OpenAI, Google Vision, etc.)
    const mockExamples = await mockAIAnalysis(base64Image)
    
    const processingTime = Date.now() - startTime
    
    return {
      examples: mockExamples,
      confidence: 0.85, // Mock confidence score
      processingTime
    }
  } catch (error) {
    console.error('Error analyzing screenshot:', error)
    throw new Error('Failed to analyze screenshot. Please try again.')
  }
}

/**
 * Mock AI analysis for development/testing
 * In production, this would be replaced with actual AI vision API calls
 * 
 * NOTE: This mock simulates what would be extracted from an actual Miro screenshot
 * In real implementation, this would analyze the actual image content
 */
const mockAIAnalysis = async (_base64Image: string): Promise<ExtractedExample[]> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Mock data simulating what would be extracted from a real Miro screenshot
  // This represents actual post-it notes or table rows visible in the image
  return [
    {
      actor: "New User",
      goal: "Sign up for the service",
      entry_point: "Landing page",
      actions: "Click sign up button, fill registration form, verify email address",
      error: "Email verification link expired",
      outcome: "Successfully created account and logged in"
    },
    {
      actor: "New User", // Same actor as above
      goal: "Sign up for the service", // Same goal
      entry_point: "Landing page", // Same entry point
      actions: "Click sign up button, fill registration form, verify email address", // Same actions
      error: "Email already exists", // Different error - this should be allowed
      outcome: "Successfully created account and logged in" // Same outcome
    },
    {
      actor: "Returning User",
      goal: "Access their dashboard",
      entry_point: "Login page",
      actions: "Enter email and password, click login button",
      error: "Forgot password, need to reset",
      outcome: "Reset password and accessed dashboard"
    },
    {
      actor: "Premium User",
      goal: "Upgrade their subscription",
      entry_point: "Account settings",
      actions: "Navigate to billing, select plan, enter payment info",
      error: "Payment method declined",
      outcome: "Updated payment method and upgraded successfully"
    }
  ]
}

/**
 * Real AI implementation using OpenAI Vision API
 * Uncomment and configure when ready to use
 */
/*
export const analyzeScreenshotWithOpenAI = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    const response = await fetch('/api/ai/analyze-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        prompt: `Analyze this Miro board screenshot containing post-it notes with user journey examples. 
        
        IMPORTANT: Only extract data that is actually visible in the screenshot. Do not create or hallucinate examples that are not present in the image.
        
        Look for post-it notes or table rows that contain user journey examples. Each example should be listed in a row, following the same column order as the example table:
        - Actor: Who is performing the action (look for user roles closely associated with the 'Actor' field, default to user roles previously created)
        - Goal: What they want to achieve  
        - Entry Point: How they start
        - Actions: Steps they take
        - Error: Problems they encounter
        - Outcome: Final result
        
        Extraction guidelines:
        - Read the actual text from each post-it note or table row in the screenshot
        - Do not invent or create examples that are not visible in the image
        - Examples might have the same fields as other examples, with only one field difference. Please allow this.
        - Only examples with all fields identical should be rejected as duplicates.
        - Focus on user roles that are closely associated with the Actor field.
        - If you cannot clearly read text in the image, do not include that example
        
        Return structured JSON data only for examples that are clearly visible and readable in the screenshot.`
      })
    })

    if (!response.ok) {
      throw new Error('AI analysis failed')
    }

    const result = await response.json()
    const processingTime = Date.now() - startTime

    return {
      examples: result.examples,
      confidence: result.confidence,
      processingTime
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error)
    throw error
  }
}
*/

/**
 * Real AI implementation using Google Vision API
 * Uncomment and configure when ready to use
 */
/*
export const analyzeScreenshotWithGoogleVision = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    const response = await fetch('/api/ai/google-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    })

    if (!response.ok) {
      throw new Error('Google Vision analysis failed')
    }

    const result = await response.json()
    const processingTime = Date.now() - startTime

    return {
      examples: result.examples,
      confidence: result.confidence,
      processingTime
    }
  } catch (error) {
    console.error('Google Vision analysis error:', error)
    throw error
  }
}
*/

/**
 * Validates extracted examples to ensure they have required fields and removes exact duplicates
 */
export const validateExtractedExamples = (examples: ExtractedExample[]): { valid: ExtractedExample[], invalid: ExtractedExample[] } => {
  const valid: ExtractedExample[] = []
  const invalid: ExtractedExample[] = []
  const seenExamples = new Set<string>()

  examples.forEach(example => {
    const hasRequiredFields = example.actor && example.goal && example.entry_point && 
                             example.actions && example.error && example.outcome
    
    if (!hasRequiredFields) {
      invalid.push(example)
      return
    }

    // Create a unique key for exact duplicate detection
    const exampleKey = `${example.actor}|${example.goal}|${example.entry_point}|${example.actions}|${example.error}|${example.outcome}`
    
    if (seenExamples.has(exampleKey)) {
      // This is an exact duplicate, mark as invalid
      invalid.push(example)
    } else {
      // This is a new example (even if similar to others)
      seenExamples.add(exampleKey)
      valid.push(example)
    }
  })

  return { valid, invalid }
}

/**
 * Enhances extracted examples with additional processing
 */
export const enhanceExtractedExamples = (examples: ExtractedExample[]): ExtractedExample[] => {
  return examples.map(example => ({
    ...example,
    // Clean up text formatting
    actor: example.actor.trim(),
    goal: example.goal.trim(),
    entry_point: example.entry_point.trim(),
    actions: example.actions.trim(),
    error: example.error.trim(),
    outcome: example.outcome.trim(),
  }))
}

/**
 * Converts a phone call transcript to a user journey JSON using OpenAI
 * @param transcript - The raw transcript text
 * @param customPrompt - The prompt to use (should be generated with user roles)
 * @param userRoleNames - Optional array of user role names to include in error messages
 * @returns Promise with the user journey JSON
 */
export const convertTranscriptToJourney = async (
  transcript: string,
  customPrompt: string,
  _userRoleNames?: string[]
): Promise<any> => {
  try {
    console.log('Converting transcript with AI (background function)...')
    
    // Get current user for background function
    if (!supabase) {
      throw new Error('Database not configured')
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }
    
    // Call background function (15 minute timeout)
    const response = await fetch('/.netlify/functions/transcript-to-journey-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        prompt: customPrompt,
        userId: user.id
      }),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      let errorMessage = 'Failed to convert transcript'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      throw new Error('Invalid JSON response from server')
    }
    
    if (!result.success || !result.journey) {
      throw new Error(result.error || 'Server response is missing journey data')
    }
    
    console.log('✓ Transcript conversion successful! (jobId:', result.jobId, ')')
    console.log('Nodes extracted:', result.journey.nodes?.length || 0)

    return result.journey
  } catch (error) {
    console.error('Error converting transcript to journey:', error)
    throw error
  }
}

/**
 * Edits an existing user journey using natural language instructions via OpenAI
 * @param currentJourney - The current journey JSON (with nodes and edges)
 * @param instruction - Natural language instruction (e.g., "Replace Amicus with ThirdFort")
 * @returns Promise with the updated journey JSON
 */
export const editJourneyWithAI = async (
  currentJourney: any,
  instruction: string
): Promise<any> => {
  try {
    console.log('Calling AI to edit journey with instruction:', instruction)
    
    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
    
    const response = await fetch('/.netlify/functions/edit-journey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentJourney,
        instruction,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    console.log('Response status:', response.status, response.statusText)

    // Get the response text first
    const responseText = await response.text()
    console.log('Response text length:', responseText.length)

    if (!response.ok) {
      // Try to parse as JSON for error details
      let errorMessage = 'Failed to edit journey'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (parseError) {
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    // Parse the successful response
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', responseText)
      throw new Error('Invalid response from server. Expected JSON but got: ' + responseText.substring(0, 100))
    }

    if (!result.journey) {
      console.error('Response missing journey data:', result)
      throw new Error('Server response is missing journey data')
    }

    // Log diagnostic information
    console.log('✓ Journey edited successfully!')
    console.log('Nodes in result:', result.journey.nodes?.length || 0)
    console.log('Token usage:', result.usage)
    console.log('Finish reason:', result.finishReason)

    return result.journey
  } catch (error) {
    console.error('Error editing journey with AI:', error)
    
    // Handle specific error types
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Try a simpler instruction or edit fewer items at once.')
    }
    
    throw error
  }
}
