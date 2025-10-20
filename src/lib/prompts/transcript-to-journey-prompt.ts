/**
 * Prompt for converting phone call transcripts to user journey JSON
 * Edit this file to customize the AI's behavior
 */

export const TRANSCRIPT_TO_JOURNEY_PROMPT = `IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

Extract:

1. Nodes: Each step or action mentioned in the transcript
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - type: Determine if it's "start" (first step), "process" (middle step), or "end" (final step)
   - position: x,y coordinates snapped to an 8x8 grid (all values MUST be multiples of 8)
   - data: An object containing the following properties:
     * label: The main text/title describing this step
     * type: Same as the top-level type ("start", "process", or "end")
     * userRole: The EXACT role name performing this step. Common roles include: "Client", "Lawyer", "End Client", "Developer", "Admin", "Partner", "Associate", "General User", "General Admin". 
       IMPORTANT: Match the exact casing and wording. If you hear "end user", "user", or "client", use "End Client". If you hear "general user", use "General User". If you hear "general admin", use "General Admin". If you hear "lawyer", "solicitor", "attorney", use "Lawyer". If unsure, use "End Client".
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
- Common role mappings:
  * "user", "end user", "client", "customer" → use "End Client"
  * "general user", "generic user" → use "General User"
  * "general admin", "generic admin" → use "General Admin"
  * "lawyer", "solicitor", "attorney", "legal professional" → use "Lawyer"
  * "developer", "engineer", "technical team" → use "Developer"
  * "admin", "administrator", "system admin" → use "Admin"
  * "partner" → use "Partner"
  * "associate" → use "Associate"
- ALWAYS use proper Title Case for roles (e.g., "End Client", not "end client"; "General User", not "general user")
- If multiple roles are mentioned for a single step, choose the primary actor
- If no role is explicitly mentioned, infer from context (e.g., "they log in" likely means "End Client")
- Default to "End Client" if uncertain

PLATFORM/VARIANT DETECTION:
- Look for platform indicators like "CMS", "Backend", "Legl", "the system" and put in data.variant
- IMPORTANT: If you hear third-party service names (Stripe, Auth0, Mailchimp, Salesforce, HubSpot, Slack, Twilio, DocuSign, etc.), set data.variant to "Third party" AND set data.thirdPartyName to the service name

LAYOUT RULES (with grid snapping):
- VERTICAL LAYOUT: For linear (non-branching) flows, keep x constant at 96 and increment y by 240px per step
  * Linear flow positions: x: 96, y: 96, 336, 576, 816, 1056...
  * All values are multiples of 8
- BRANCHING LAYOUT: When a step splits into multiple paths (branches):
  * Space branches 384px apart horizontally: x: 96, 480, 864, 1248... (all multiples of 8)
  * The parent node should be CENTERED horizontally above its child branches
  * Example: If parent has 2 child branches at x: 96 and x: 480, position parent at x: 288 (centered and snapped to grid)
  * Example: If parent has 3 child branches at x: 96, x: 480, x: 864, position parent at x: 480 (centered)
  * Formula: parent x = round((leftmost_child_x + rightmost_child_x) / 2 / 8) * 8
  * All branch nodes at the same level should share the same y coordinate
  * Vertical gap between parent and branches: 240px (multiple of 8)
- After branches converge, resume vertical linear layout
- Both the top-level "type" and "data.type" should have the same value
- Always include data.customProperties as an empty object {}
- REMEMBER: Every x and y value must be a multiple of 8

EDGE LABELS:
- Only include labels on edges that represent branch/conditional paths (e.g., "Yes", "No", "If successful", "On error")
- For strictly linear edges, set both the top-level "label" and "data.label" to empty strings ""
- Branch edges should clearly indicate the condition or choice

BULLET POINTS:
- Extract any mentioned sub-steps, details, or specific actions as bulletPoints in the data object
- Keep bullet points concise and actionable

FINAL REMINDER: All x and y coordinates must be multiples of 8. Double-check all position values before returning the JSON.

Return ONLY the JSON object, no other text.`

