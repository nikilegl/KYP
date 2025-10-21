/**
 * Transcript to Journey Prompt
 * Focuses on extracting content and connections from transcripts
 * Layout is handled separately by verticalJourneyLayoutCalculator or horizontalJourneyLayoutCalculator
 */

/**
 * Generates the transcript-to-journey prompt with dynamic user roles
 * @param userRoleNames - Array of user role names from the database
 */
export const generateTranscriptToJourneyPrompt = (userRoleNames: string[]): string => {
  const rolesList = userRoleNames.length > 0 
    ? userRoleNames.map(name => `"${name}"`).join(', ')
    : '"End Client", "Admin", "Developer"' // Fallback if no roles
  
  return `You are analyzing a meeting transcript about a user journey. Extract the following information and return it as valid JSON:

YOUR ONLY JOB: Extract content and connections. Do NOT calculate positions.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

CRITICAL RULES - CONTENT EXTRACTION ONLY:
- Extract: node labels, types, roles, platforms, connections (edges), bullet points
- Do NOT calculate or output any position fields (x, y, width, height)
- Do NOT try to replicate layout or spacing - that is handled by a separate system
- Focus on accuracy of content and connections

Extract:

1. Nodes: Each step or action mentioned in the transcript
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - type: Determine if it's "start" (first step), "process" (middle step), "end" (final step), or "label" (contextual information with no connections)
   - data: An object containing the following properties:
     * label: The main text/title describing this step
     * type: Same as the top-level type ("start", "process", "end", or "label")
     * userRole: The EXACT role name performing this step. Available roles in this workspace: ${rolesList}. 
       IMPORTANT: Match the exact casing and wording from the available roles. ONLY use roles from the list above. If the role mentioned in the transcript doesn't exactly match an available role, choose the closest match. If completely unsure, use the first role from the list.
     * variant: If platform mentioned, one of: "CMS", "Legl", "End client", "Back end", "Third party", or empty string ""
     * thirdPartyName: If variant is "Third party", include the name of the third party service (e.g., "Stripe", "Auth0", "Mailchimp", "Salesforce"). Otherwise, leave as empty string "".
     * bulletPoints: Array of any detailed actions or sub-steps mentioned
     * notifications: Array of notifications (pain points, warnings, info, positive feedback) related to this step. Each notification should have:
       - id: unique identifier (e.g., "notif-1")
       - type: one of "pain-point", "warning", "info", "positive"
       - message: the notification text
     * customProperties: Empty object {}

2. Edges: Connections/flow between steps
   - id: Generate unique identifier (e.g., "edge-1-2")
   - source: The id of the source node
   - target: The id of the target node
   - label: Only include a label if the edge is part of a branch/conditional path (e.g., "If purchase", "If successful", "On error"). For strictly linear, non-branching flows, set "label" to an empty string "".
   - data: An object containing:
     * label: Same text as the top-level label. For strictly linear, non-branching flows, set to an empty string "".

3. Metadata:
   - name: Title of the journey (infer from transcript context)
   - description: Brief summary of the overall flow

Return format:
{
  "name": "Journey Name",
  "description": "Journey description",
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "data": {
        "label": "Node description",
        "type": "start",
        "userRole": "End Client",
        "variant": "End client",
        "thirdPartyName": "",
        "bulletPoints": ["item 1", "item 2"],
        "notifications": [],
        "customProperties": {}
      }
    },
    {
      "id": "node-2",
      "type": "process",
      "data": {
        "label": "Process payment",
        "type": "process",
        "userRole": "End Client",
        "variant": "Third party",
        "thirdPartyName": "Stripe",
        "bulletPoints": ["Enter card details", "Confirm payment"],
        "notifications": [
          {
            "id": "notif-1",
            "type": "pain-point",
            "message": "Users often struggle with payment form"
          }
        ],
        "customProperties": {}
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1-2",
      "source": "node-1",
      "target": "node-2",
      "label": "",
      "data": {
        "label": ""
      }
    }
  ]
}

Guidelines:
- CRITICAL: All node properties (label, type, userRole, variant, thirdPartyName, bulletPoints, notifications, customProperties) MUST be inside the "data" object
- DO NOT include position fields - layout is calculated separately
- Analyze the transcript to identify distinct steps in the user journey
- Identify clear start and end points from the conversation flow
- Carefully detect connections between steps to create accurate edges

USER ROLE DETECTION (CRITICAL):
- Pay close attention to who is performing each action in the transcript
- ONLY use roles from this list: ${rolesList}
- Match the EXACT casing and spelling from the available roles
- If multiple roles are mentioned for a single step, choose the primary actor
- If no role is explicitly mentioned, infer from context and choose the closest match from available roles
- When in doubt, use the first role from the available roles list

PLATFORM/VARIANT DETECTION:
- Look for platform indicators like "CMS", "Backend", "Legl", "the system" and put in data.variant
- IMPORTANT: If you hear third-party service names (Stripe, Auth0, Mailchimp, Salesforce, HubSpot, Slack, Twilio, DocuSign, etc.), set data.variant to "Third party" AND set data.thirdPartyName to the service name

EDGE LABELS:
- Main path edges (continuing straight down): empty labels ""
- Conditional/branch edges (diverging to alternate paths): descriptive labels like "If purchase", "If successful", "On error"
- Convergence edges (from branches back to main flow): empty labels ""

BULLET POINTS:
- Extract any mentioned sub-steps, details, or specific actions as bulletPoints in the data object
- Keep bullet points concise and actionable
- Only extract explicitly mentioned sub-steps, not general descriptions

NOTIFICATIONS:
- Detect pain points, warnings, information, and positive feedback mentioned in the transcript
- Types: "pain-point" (problems, issues), "warning" (cautions, risks), "info" (notes, context), "positive" (successes, improvements)
- Each notification needs: id (unique), type (from above), message (the actual text)

FINAL REMINDER: Focus on accurate content extraction and connection detection. Do NOT include any position information. Return ONLY the JSON object, no other text.`
}

// Legacy export for backward compatibility (uses first 3 default roles)
export const TRANSCRIPT_TO_JOURNEY_PROMPT = generateTranscriptToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

