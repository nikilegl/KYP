/**
 * Prompt for converting phone call transcripts to user journey JSON
 * Edit this file to customize the AI's behavior
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

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

Extract:

1. Nodes: Each step or action mentioned in the transcript
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - type: Determine if it's "start" (first step), "process" (middle step), or "end" (final step)
   - position: x,y coordinates snapped to an 8x8 grid (all values MUST be multiples of 8)
   - data: An object containing the following properties:
     * label: The main text/title describing this step
     * type: Same as the top-level type ("start", "process", or "end")
     * userRole: The EXACT role name performing this step. Available roles in this workspace: ${rolesList}. 
       IMPORTANT: Match the exact casing and wording from the available roles. ONLY use roles from the list above. If the role mentioned in the transcript doesn't exactly match an available role, choose the closest match. If completely unsure, use the first role from the list.
     * variant: If platform mentioned, one of: "CMS", "Legl", "End client", "Back end", "Third party", or empty string ""
     * thirdPartyName: If variant is "Third party", include the name of the third party service (e.g., "Stripe", "Auth0", "Mailchimp", "Salesforce"). Otherwise, leave as empty string "".
     * bulletPoints: Array of any detailed actions or sub-steps mentioned
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
      "position": {"x": 96, "y": 96},
      "data": {
        "label": "Node description",
        "type": "start",
        "userRole": "End Client",
        "variant": "End client",
        "thirdPartyName": "",
        "bulletPoints": ["item 1", "item 2"],
        "customProperties": {}
      }
    },
    {
      "id": "node-2",
      "type": "process",
      "position": {"x": 96, "y": 336},
      "data": {
        "label": "Process payment",
        "type": "process",
        "userRole": "End Client",
        "variant": "Third party",
        "thirdPartyName": "Stripe",
        "bulletPoints": ["Enter card details", "Confirm payment"],
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
- CRITICAL: All node properties (label, type, userRole, variant, thirdPartyName, bulletPoints, customProperties) MUST be inside the "data" object
- Analyze the transcript to identify distinct steps in the user journey
- Identify clear start and end points from the conversation flow

GRID SNAPPING (CRITICAL):
- ALL x and y coordinates MUST be multiples of 8
- Examples of valid coordinates: 0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256, 264, 272, 280, 288, 296, 304, 312, 320, 328, 336, 344, 352, 360, 368, 376, 384, 392, 400, 408, 416, 424, 432, 440, 448, 456, 464, 472, 480...
- Examples of INVALID coordinates: 100, 105, 237, 378, 425, 340, 380 (not multiples of 8)
- When calculating positions, always round to the nearest multiple of 8
- This ensures nodes align properly on the grid

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

LAYOUT RULES (with grid snapping):
- VERTICAL LAYOUT: For linear (non-branching) flows, keep x constant at 96 and increment y by 240px per step
  * Linear flow positions: x: 96, y: 96, 336, 576, 816, 1056...
  * All values are multiples of 8
  
- BRANCHING LAYOUT (CRITICAL - DIVERGENT BRANCHES TO THE RIGHT):
  * When a step splits into multiple paths (branches), the parent node STAYS on the main vertical line at x: 96
  * The MAIN/PRIMARY branch continues straight down at x: 96 (same as parent)
  * CONDITIONAL/ALTERNATE branches diverge to the RIGHT at x: 480, 864, 1248... (384px apart)
  * Do NOT center the parent node - it must remain at x: 96
  
  * Example with 2 branches:
    - Parent node (where split occurs): x: 96, y: 100
    - Main branch (continues main flow): x: 96, y: 340
    - Conditional branch (diverges right): x: 480, y: 340
    - Both branch nodes share the SAME y coordinate (same horizontal level)
    - Vertical gap between parent and branches: 240px
  
  * Example with edge labels:
    - Parent → Main branch: label = "" (no label, main path)
    - Parent → Conditional branch: label = "If purchase" (conditional path)
  
  * After branches: Both branches connect to the next step (convergence point) which resumes at x: 96
  
- BRANCH CONVERGENCE: When branches rejoin:
  * Both branch nodes connect to the next convergence node
  * Convergence node returns to x: 96 (main vertical flow)
  * Convergence node y = (branch y + 240px)
  * Both edges from branches to convergence typically have empty labels ""
  
- Both the top-level "type" and "data.type" should have the same value
- Always include data.customProperties as an empty object {}
- REMEMBER: Every x and y value must be a multiple of 8
- REMEMBER: Parent node stays at x: 96, branches diverge to the RIGHT

EDGE LABELS:
- Main path edges (continuing straight down): empty labels ""
- Conditional/branch edges (diverging right): descriptive labels like "If purchase", "If successful", "On error"
- Convergence edges (from branches back to main flow): empty labels ""

BULLET POINTS:
- Extract any mentioned sub-steps, details, or specific actions as bulletPoints in the data object
- Keep bullet points concise and actionable

FINAL REMINDER: All x and y coordinates must be multiples of 8. When branches occur, keep the parent at x: 96, main branch at x: 96, and conditional branches diverge to the RIGHT at x: 480, 864, etc. Double-check all position values before returning the JSON.

Return ONLY the JSON object, no other text.`
}

// Legacy export for backward compatibility (uses first 3 default roles)
export const TRANSCRIPT_TO_JOURNEY_PROMPT = generateTranscriptToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

