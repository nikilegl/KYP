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
  
  return `You are analyzing a meeting transcript that may contain ONE OR MORE separate user journeys. Extract the following information and return it as valid JSON:

YOUR ONLY JOB: Extract content and connections. Do NOT calculate positions.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

CRITICAL RULES - CONTENT EXTRACTION ONLY:
- Extract: node labels, types, roles, platforms, connections (edges), bullet points
- Do NOT calculate or output any position fields (x, y, width, height)
- Do NOT try to replicate layout or spacing - that is handled by a separate system
- Focus on accuracy of content and connections
- NOTE: The layout system will automatically position nodes with at least 40px vertical spacing between them for clear readability

DETECTING MULTIPLE JOURNEYS (CRITICAL):
- A transcript may describe MULTIPLE SEPARATE user journeys that should NOT be connected to each other
- Common patterns indicating separate journeys:
  * "Current process" vs "Future process" / "New process with Legl"
  * "What we do now" vs "What it will be using Legl"
  * Different process types: "Pay process", "KYC process" (onboarding individuals), "KYB process" (onboarding businesses)
  * "Before" vs "After" comparisons
  * Different workflows for different scenarios
- When you detect separate journeys:
  * Create nodes for ALL journeys in the same nodes array
  * Only create edges WITHIN each journey - NEVER between different journeys
  * Each journey should START WITH A LABEL NODE that describes the journey (e.g., "Current Client Onboarding", "Future Pay Process with Legl")
  * After the label node, add a start node, followed by process nodes, and end with an end node
  * The label node is NOT connected to any other nodes (it has no edges)
  * Do NOT add prefixes to individual node labels - the label node at the start of the journey provides the context

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

Return format (SINGLE JOURNEY):
{
  "name": "Payment Journey",
  "description": "User payment process",
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "data": {
        "label": "User initiates payment",
        "type": "start",
        "userRole": "End Client",
        "variant": "End client",
        "thirdPartyName": "",
        "bulletPoints": ["Click pay button"],
        "notifications": [],
        "customProperties": {}
      }
    },
    {
      "id": "node-2",
      "type": "end",
      "data": {
        "label": "Payment complete",
        "type": "end",
        "userRole": "End Client",
        "variant": "Third party",
        "thirdPartyName": "Stripe",
        "bulletPoints": ["Receive confirmation"],
        "notifications": [],
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
      "data": { "label": "" }
    }
  ]
}

Return format (MULTIPLE SEPARATE JOURNEYS - Current vs Future):
{
  "name": "Onboarding - Current vs Future with Legl",
  "description": "Comparison of current manual process and future automated process",
  "nodes": [
    {
      "id": "label-1",
      "type": "label",
      "data": {
        "label": "Current Client Onboarding",
        "type": "label",
        "userRole": null,
        "variant": "",
        "thirdPartyName": "",
        "bulletPoints": [],
        "notifications": [],
        "customProperties": {}
      }
    },
    {
      "id": "node-1",
      "type": "start",
      "data": {
        "label": "Client submits documents via email",
        "type": "start",
        "userRole": "End Client",
        "variant": "End client",
        "thirdPartyName": "",
        "bulletPoints": ["Email documents", "Wait for response"],
        "notifications": [
          { "id": "notif-1", "type": "pain-point", "message": "Slow and error-prone" }
        ],
        "customProperties": {}
      }
    },
    {
      "id": "node-2",
      "type": "end",
      "data": {
        "label": "Manual review complete",
        "type": "end",
        "userRole": "Admin",
        "variant": "CMS",
        "thirdPartyName": "",
        "bulletPoints": ["Download attachments", "Manual data entry", "Send confirmation"],
        "notifications": [],
        "customProperties": {}
      }
    },
    {
      "id": "label-2",
      "type": "label",
      "data": {
        "label": "Future Client Onboarding with Legl",
        "type": "label",
        "userRole": null,
        "variant": "",
        "thirdPartyName": "",
        "bulletPoints": [],
        "notifications": [],
        "customProperties": {}
      }
    },
    {
      "id": "node-3",
      "type": "start",
      "data": {
        "label": "Client uploads to Legl portal",
        "type": "start",
        "userRole": "End Client",
        "variant": "Legl",
        "thirdPartyName": "",
        "bulletPoints": ["Drag and drop documents", "Instant validation"],
        "notifications": [
          { "id": "notif-2", "type": "positive", "message": "Much faster and more secure" }
        ],
        "customProperties": {}
      }
    },
    {
      "id": "node-4",
      "type": "end",
      "data": {
        "label": "Automated review with Legl",
        "type": "end",
        "userRole": "Admin",
        "variant": "Legl",
        "thirdPartyName": "",
        "bulletPoints": ["Auto-extract data", "AI verification", "Auto-send confirmation"],
        "notifications": [],
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
      "data": { "label": "" }
    },
    {
      "id": "edge-3-4",
      "source": "node-3",
      "target": "node-4",
      "label": "",
      "data": { "label": "" }
    }
  ]
}

NOTE: In the second example, there are TWO separate journeys (Current and Future). 
- Label node "label-1" describes the first journey: "Current Client Onboarding"
- Nodes 1-2 form the actual "Current" journey (connected by edge-1-2)
- Label node "label-2" describes the second journey: "Future Client Onboarding with Legl"
- Nodes 3-4 form the actual "Future" journey (connected by edge-3-4)
- Label nodes have NO edges connecting to other nodes
- NO edge connects node-2 to node-3 because they are separate journeys

Guidelines:
- CRITICAL: All node properties (label, type, userRole, variant, thirdPartyName, bulletPoints, notifications, customProperties) MUST be inside the "data" object
- DO NOT include position fields - layout is calculated separately
- Analyze the transcript to identify distinct steps in the user journey OR multiple separate journeys
- Identify clear start and end points from the conversation flow
- Carefully detect connections between steps to create accurate edges
- MULTIPLE JOURNEYS: If the transcript discusses multiple separate processes (e.g., current vs future, KYC vs KYB vs Pay), create separate unconnected node groups:
  * Example: If discussing "current onboarding" and "future onboarding with Legl", create two separate flows with no edges between them
  * Example: If discussing "KYC for individuals" and "KYB for businesses", create two separate flows
  * IMPORTANT: Start each journey with a label node that describes the journey (e.g., "Current Client Onboarding", "Future Pay with Legl", "KYC Individual Verification")
  * The label node provides context for the journey and is NOT connected to any other nodes
  * Do NOT add prefixes to the actual process node labels - the label node at the start provides the context
- Each separate journey should have its own label node (if multiple journeys), "start" node, and "end" node
- Nodes within the same journey should be connected with edges; nodes from different journeys should NEVER connect to each other
- Label nodes are standalone and have NO edges

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

FINAL REMINDERS:
1. Focus on accurate content extraction and connection detection
2. DO NOT include any position information
3. CRITICAL: If transcript contains multiple separate journeys (current vs future, KYC vs KYB vs Pay, etc.), create separate unconnected node groups
4. Listen for key phrases: "current process", "what it will be using Legl", "KYC", "KYB", "payment process", "onboarding individuals", "onboarding businesses"
5. Each separate journey needs its own label node (describing the journey), start node, and end node with NO edges connecting different journeys
6. IMPORTANT: Use label nodes to describe journeys, NOT prefixes in node labels (e.g., create a label node "Current Pay" rather than prefixing all nodes with "Current:")
7. Label nodes are type "label" and have NO edges
8. Return ONLY the JSON object, no other text`
}

// Legacy export for backward compatibility (uses first 3 default roles)
export const TRANSCRIPT_TO_JOURNEY_PROMPT = generateTranscriptToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

