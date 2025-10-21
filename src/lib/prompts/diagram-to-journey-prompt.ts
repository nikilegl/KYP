/**
 * Prompt for converting user journey diagram screenshots (e.g., from Miro) to user journey JSON
 * This prompt analyzes visual diagrams and preserves layout, detects pain points, and regions
 */

/**
 * Generates the diagram-to-journey prompt with dynamic user roles
 * @param userRoleNames - Array of user role names from the database
 */
export const generateDiagramToJourneyPrompt = (userRoleNames: string[]): string => {
  const rolesList = userRoleNames.length > 0 
    ? userRoleNames.map(name => `"${name}"`).join(', ')
    : '"End Client", "Admin", "Developer"' // Fallback if no roles
  
  return `You are analyzing a user-journey diagram image (Miro/Figma style).

YOUR ONLY JOB: Extract content and connections. Do NOT calculate positions.

Return ONLY valid JSON with this schema:
{
  "name": "string",
  "layout": "horizontal|vertical",
  "lanes": [{"index": 0, "label": "string"}],
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "laneIndex": 0,
      "laneName": "string",
      "type": "start|process|end",
      "userRole": "string",
      "platform": "End client|GLP|CMS|Legl|Back end|Third party|Other",
      "thirdPartyName": "string",
      "roleConfidence": 0.0,
      "platformConfidence": 0.0,
      "bulletPoints": ["string"],
      "notifications": [
        {
          "id": "string",
          "type": "pain-point|warning|info|positive",
          "message": "string"
        }
      ]
    }
  ],
  "edges": [
    {
      "source": "string",
      "target": "string",
      "label": "string",
      "data": {"label": "string"}
    }
  ],
  "audit": {
    "arrowCountDetected": 0,
    "edgeCountReturned": 0,
    "hasCycles": false,
    "notes": ""
  }
}
CRITICAL RULES - CONTENT EXTRACTION ONLY
* **Do NOT calculate or output any position fields (x, y, width, height)**
* **Do NOT try to replicate the layout or spacing** - that is handled by a separate system
* **ONLY extract:** labels, types, roles, platforms, lanes, edges, bullet points, notifications

Layout Detection (populate "layout" field):
* **Horizontal Layout:** Nodes flow LEFT-TO-RIGHT with swim lanes as HORIZONTAL ROWS
  - Visual indicators: Nodes arranged in horizontal rows/bands
  - Swim lane labels typically on the left side
  - Time flows left to right (start → middle → end)
  - Example: Swim lane diagrams where each actor has a horizontal lane
* **Vertical Layout:** Nodes flow TOP-TO-BOTTOM in a vertical sequence
  - Visual indicators: Nodes stacked vertically, flowing downward
  - May have branches that diverge horizontally but main flow is vertical
  - Time flows top to bottom (start → middle → end)
  - Example: Traditional flowcharts, decision trees
* **How to decide:**
  - Look at the PRIMARY direction of flow (follow the arrows)
  - If most nodes are arranged in left-to-right sequences with horizontal lanes → "horizontal"
  - If most nodes are arranged in top-to-bottom sequences → "vertical"
  - When in doubt, look at where the start node is positioned relative to end nodes
  - Default to "horizontal" if swim lanes are present

PRIORITY #1: Edge Detection - Detect every arrow/edge carefully:
1. Physically scan the entire diagram looking for arrows
2. Count them (set audit.arrowCountDetected)
3. Trace each arrow from start to end
4. Create one edge per arrow with correct source and target IDs
5. Verify audit.edgeCountReturned === audit.arrowCountDetected

Edge Labels (Critical for Branch/Conditional Detection):
* **Purpose:** Edge labels identify branching, conditional paths, and decision points
* **What to look for:**
  - Text on or near arrows (e.g., "Yes", "No", "If successful", "On error", "If approved", "Else")
  - Decision indicators (checkmark vs X, success vs failure)
  - Conditional flow markers
* **Labeling rules:**
  - **Main path/linear flow edges:** Set 'label: ""' and 'data.label: ""' (empty strings)
  - **Branch/conditional edges:** Set 'label: "[the text]"' and 'data.label: "[the text]"' (same text in both)
  - **Convergence edges** (multiple branches rejoining): Set 'label: ""' and 'data.label: ""' (empty strings)
* **Examples:**
  - Arrow labeled "If purchase" → {"source": "checkout", "target": "payment", "label": "If purchase", "data": {"label": "If purchase"}}
  - Arrow labeled "Success" → {"source": "validate", "target": "continue", "label": "Success", "data": {"label": "Success"}}
  - Arrow with no label (linear flow) → {"source": "step1", "target": "step2", "label": "", "data": {"label": ""}}
  - Arrow rejoining from branch → {"source": "branch", "target": "merge", "label": "", "data": {"label": ""}}
* **Impact:** Edge labels determine layout behavior in vertical diagrams:
  - Unlabeled edges = main path (continues straight down)
  - Labeled edges = branches (diverge to the right)
  - This enables proper rendering of decision trees and conditional flows

Node Content Extraction:
* **Node Labels and Bullet Points:**
  - The 'label' field should contain the complete main title/action of the node
  - Do NOT truncate the label or move parts of it to bulletPoints
  - ONLY populate bulletPoints if there are EXPLICIT bullet/numbered lists visible
  - Do NOT duplicate information between label and bulletPoints
* **ALL nodes MUST be assigned to a lane** by their visual row position:
  - Look at which horizontal row/band the node sits in
  - Assign laneIndex accordingly (0 = top row, 1 = second row, etc.)
  - If no swim lanes exist, all nodes get laneIndex: 0

Other Rules:
* If a node has multiple parents, include ALL incoming edges (multiple edges can target the same node)
* Output must be acyclic (audit.hasCycles = false). If a loop is detected, drop the least-confident edge and explain in audit.notes
* All strings should be trimmed; keep original casing for labels; normalize enums exactly as listed
* **Critical:** An arrow from node A to node B means edge {source: "A", target: "B"}, NOT the reverse
User role detection (populate nodes[*].userRole)
1. Primary heuristic (lane label):If the node sits in lane L, set userRole = lanes.find(l => l.index === laneIndex).label.
2. Fallbacks (if the lane label is generic or missing):
    * Use explicit actor text near/in the node (e.g., “Client”, “Admin”, “Developer”).
    * Use verbs and context (“prints and signs” → likely “End Client”; “save to Denovo” → internal/system role).
3. Match against available roles and keep exact casing. If no close match, return the lane label as seen or the first item from Available roles.
4. Set roleConfidence in [0,1].
Platform detection (populate platform and thirdPartyName)
Choose one value for platform:
* End client (end-user actions in client lane)
* GLP (internal ops in GLP lane)
* CMS (explicitly mentions CMS)
* Legl (explicitly mentions Legl)
* Back end (system/API/server processes, data stores)
* Third party (external services)
* Other (none of the above)
Heuristics & mapping:
* If a third-party logo/name is visible (e.g., Stripe, Auth0, Slack, Salesforce, Amiqus), set platform = "Third party" and thirdPartyName to that brand (exact casing).
* If node text includes “API”, “DB”, “server”, “backend”, or clearly system-only actions, prefer Back end.
* If lane label is a product/team (e.g., “GLP”), align platform to that label unless text indicates a specific third party.
* If text explicitly mentions CMS or Legl, set platform accordingly.
* Otherwise infer from lane/wording; if unsure, use Other and leave thirdPartyName empty.
* Set platformConfidence in [0,1].

Bullet Points Detection (populate nodes[*].bulletPoints)
* **What to extract:** ONLY explicitly listed sub-steps or details shown as bullets/numbered lists
* **Visual cues to look for:**
  - Actual bullet points (•) or numbered lists (1., 2., 3.) inside the node
  - Clear visual separation between main title and sub-items
* **CRITICAL - What NOT to extract:**
  - Do NOT split descriptive text into bullet points
  - Do NOT create bullet points from a single continuous description
  - The node label should contain the full action/title - do not truncate it
* **Guidelines:**
  - ONLY extract bullet points if there are EXPLICIT bullets or numbered lists visible
  - Each bullet point should be a distinct, separately listed item
  - Keep bullet points concise and actionable
  - Preserve the original wording when possible
  - If no explicit bullet list exists, bulletPoints MUST be an empty array []
* **Examples:**
  - Node showing: 'Complete questionnaire' with bullets below: '• Enter personal details • Upload documents • Review information' → label: "Complete questionnaire", bulletPoints: ['Enter personal details', 'Upload documents', 'Review information']
  - Node showing: 'Send email to client with terms and conditions' → label: "Send email to client with terms and conditions", bulletPoints: []
  - Node showing: 'Client accepts offer' → label: "Client accepts offer", bulletPoints: []

Notifications Detection (populate nodes[*].notifications)
* **What to detect:** Pain points, warnings, information notes, and positive feedback associated with nodes
* **Visual indicators to look for:**
  - Red/pink badges, icons, or sticky notes (pain points)
  - Yellow/amber badges or warning symbols (warnings)
  - Blue/gray badges or info icons (information)
  - Green badges or checkmarks (positive feedback)
  - Text containing keywords: 'pain point', 'issue', 'problem', 'slow', 'confusing', 'warning', 'note', 'FYI', 'success', 'improvement'
* **Notification types:**
  - **pain-point**: Problems, issues, friction points, user frustrations, blockers
    * Keywords: pain, problem, issue, slow, broken, confusing, frustrating, difficult, error
  - **warning**: Cautions, risks, things to watch out for
    * Keywords: warning, caution, risk, watch out, be careful, important
  - **info**: General information, notes, FYI, context
    * Keywords: note, FYI, info, remember, context, detail
  - **positive**: Successes, improvements, good outcomes, opportunities
    * Keywords: success, good, improvement, opportunity, works well, solved
* **Guidelines:**
  - Look for sticky notes, badges, or annotations near/on the node
  - Each notification needs: id (generate unique), type (from above), message (the actual text)
  - If no notifications visible for a node, notifications should be an empty array []
  - Be conservative - only create notifications when there's clear visual or textual evidence
* **Examples:**
  - Red sticky note on node saying 'User often confused here' → {"id": "notif-1", "type": "pain-point", "message": "User often confused here"}
  - Yellow badge with 'Check permissions first' → {"id": "notif-2", "type": "warning", "message": "Check permissions first"}
  - Green checkmark with 'Improved process' → {"id": "notif-3", "type": "positive", "message": "Improved process"}

Lanes (Swim Lane Detection)
* **Step 1: Detect if swim lanes are used** - Look for distinct horizontal rows of nodes
  - Visual cues: colored horizontal bands, horizontal dividing lines, grouped rows
  - If nodes are organized in clear horizontal rows/layers, this is a swim lane diagram
* **Step 2: Count and identify lanes** - Number them from top to bottom (index 0, 1, 2...)
* **Step 3: Name each lane:**
  - **Option A: Look for visible labels** - Check left side or within the colored band for text like "End Client", "GLP", "Denovo", "Admin", "Backend"
  - **Option B: If no label found** - Name by pattern:
    * If it matches an Available role, use that role name (keep exact casing)
    * Otherwise, use descriptive name like "Lane 1", "Lane 2", "Lane 3"
* **Step 4: Assign nodes to lanes:**
  - Determine which horizontal row/band each node visually sits in
  - Set node's laneIndex to match that lane (0 = top, 1 = second from top, etc.)
  - **IMPORTANT**: Also set node's laneName to the label of that lane (e.g., "End Client", "GLP", "Lane 1")
  - All nodes in the same visual row should have the same laneIndex AND laneName
* **Example:**
  - Top colored band labeled "End Client" → {"index": 0, "label": "End Client"}
  - Middle colored band labeled "GLP" → {"index": 1, "label": "GLP"}
  - Bottom colored band labeled "Denovo" → {"index": 2, "label": "Denovo"}
  - Nodes in top row → laneIndex: 0, laneName: "End Client"
  - Nodes in middle row → laneIndex: 1, laneName: "GLP"
  - Nodes in bottom row → laneIndex: 2, laneName: "Denovo"
* **If NO swim lanes detected** - Create single lane: [{"index": 0, "label": "Main Flow"}] and set all nodes' laneIndex: 0, laneName: "Main Flow"
Edges (CRITICAL - Most Important Section)
* **Step 1: COUNT arrows first** - Scan the entire diagram and count every visible arrow/line. Set this count in audit.arrowCountDetected.
* **Step 2: TRACE each arrow individually:**
  - Find where the arrow/line physically starts (the tail) → this is the SOURCE node ID
  - Follow the arrow to where it ends (the arrowhead/tip) → this is the TARGET node ID
  - Create one edge: {"source": "source-id", "target": "target-id"}
* **Important detection rules:**
  - Only record VISIBLE arrows (no assumed connections based on proximity)
  - Arrows can cross between lanes (vertical arrows are common in swim lanes)
  - Curved arrows, straight arrows, diagonal arrows - all count
  - If two nodes are next to each other but NO arrow connects them, do NOT create an edge
  - Double-check: audit.edgeCountReturned should equal audit.arrowCountDetected
* **Common mistakes to avoid:**
  - ❌ Creating edges between adjacent nodes without arrows
  - ❌ Missing arrows that cross between lanes
  - ❌ Confusing arrow direction (always trace from tail to head)
  - ❌ Counting the same arrow twice
* **Verification:** Before returning, verify that every arrow in the image has a corresponding edge in your JSON.

**Example - Complete Swim Lane Diagram with Edges:**

Visual diagram has 3 colored horizontal bands:
- Top band (yellow/beige): labeled "End Client" - contains 4 nodes
- Middle band (blue): labeled "GLP" - contains 1 node
- Bottom band (purple): labeled "Denovo" - contains 1 node

Arrows detected: 5 arrows total
- Arrow 1: From "Client accepts offer" (top row) → to "Offer saved to Denovo" (bottom row)
- Arrow 2: From "Offer saved to Denovo" (bottom row) → to "Send documents" (middle row)
- Arrow 3: From "Send documents" (middle row) → to "Client prints Terms" (top row)
- Arrow 4: From "Client prints Terms" (top row) → to "Complete questionnaire" (top row)
- Arrow 5: From "Complete questionnaire" (top row) → to "Complete Amiqus check" (top row)

Your JSON should have:
{
  "lanes": [
    {"index": 0, "label": "End Client"},
    {"index": 1, "label": "GLP"},
    {"index": 2, "label": "Denovo"}
  ],
  "nodes": [
    {
      "id": "node-1", 
      "label": "Client accepts offer", 
      "laneIndex": 0, 
      "laneName": "End Client",
      "type": "start",
      "bulletPoints": ["Review terms", "Sign electronically"],
      "notifications": [
        {"id": "notif-1", "type": "pain-point", "message": "Clients often confused about next steps"}
      ]
    },
    {
      "id": "node-2", 
      "label": "Client prints Terms", 
      "laneIndex": 0, 
      "laneName": "End Client",
      "type": "process",
      "bulletPoints": [],
      "notifications": []
    },
    {
      "id": "node-3", 
      "label": "Complete questionnaire", 
      "laneIndex": 0, 
      "laneName": "End Client",
      "type": "process",
      "bulletPoints": ["Personal details", "Upload ID", "Verify email"],
      "notifications": [
        {"id": "notif-2", "type": "warning", "message": "ID verification can take 24 hours"}
      ]
    },
    {
      "id": "node-4", 
      "label": "Complete Amiqus check", 
      "laneIndex": 0, 
      "laneName": "End Client",
      "type": "end",
      "bulletPoints": [],
      "notifications": [
        {"id": "notif-3", "type": "positive", "message": "Automated process works well"}
      ]
    },
    {
      "id": "node-5", 
      "label": "Send documents", 
      "laneIndex": 1, 
      "laneName": "GLP",
      "type": "process",
      "bulletPoints": ["Prepare packet", "Email client"],
      "notifications": []
    },
    {
      "id": "node-6", 
      "label": "Offer saved to Denovo", 
      "laneIndex": 2, 
      "laneName": "Denovo",
      "type": "process",
      "bulletPoints": [],
      "notifications": [
        {"id": "notif-4", "type": "info", "message": "Backup created automatically"}
      ]
    }
  ],
  "edges": [
    {"source": "node-1", "target": "node-6", "label": "", "data": {"label": ""}},
    {"source": "node-6", "target": "node-5", "label": "", "data": {"label": ""}},
    {"source": "node-5", "target": "node-2", "label": "", "data": {"label": ""}},
    {"source": "node-2", "target": "node-3", "label": "", "data": {"label": ""}},
    {"source": "node-3", "target": "node-4", "label": "", "data": {"label": ""}}
  ],
  "audit": {"arrowCountDetected": 5, "edgeCountReturned": 5, "hasCycles": false}
}

Key observations:
- 3 lanes detected, numbered 0-2 from top to bottom with labels
- Each node assigned to correct lane with BOTH laneIndex and laneName
- All 4 nodes in top row have laneIndex: 0 AND laneName: "End Client"
- Node in middle row has laneIndex: 1 AND laneName: "GLP"
- Node in bottom row has laneIndex: 2 AND laneName: "Denovo"
- laneName allows the swim lane to be displayed in the Edit Node modal
- Edges correctly trace arrow connections, even across lanes
- Even though nodes 2, 3, 4 are adjacent in same lane, flow goes through other lanes first
- bulletPoints extracted from sub-steps within nodes (e.g., node-1, node-3, node-5)
- notifications detected from visual indicators (red for pain-points, yellow for warnings, green for positive, blue for info)
- Nodes without sub-steps have empty bulletPoints arrays []
- Nodes without visible annotations have empty notifications arrays []
- All edges have label fields (empty strings for linear flow, text for conditional branches)

Example 2 - Vertical Diagram with Branching (Conditional Flow):
{
  "name": "Payment Processing Flow",
  "layout": "vertical",
  "lanes": [],
  "nodes": [
    {
      "id": "start",
      "label": "Initiate payment",
      "laneIndex": 0,
      "laneName": "",
      "type": "start",
      "bulletPoints": [],
      "notifications": []
    },
    {
      "id": "validate",
      "label": "Validate payment details",
      "laneIndex": 0,
      "laneName": "",
      "type": "process",
      "bulletPoints": ["Check card number", "Verify CVV", "Validate expiry"],
      "notifications": []
    },
    {
      "id": "process",
      "label": "Process payment",
      "laneIndex": 0,
      "laneName": "",
      "type": "process",
      "bulletPoints": [],
      "notifications": []
    },
    {
      "id": "retry",
      "label": "Retry payment",
      "laneIndex": 0,
      "laneName": "",
      "type": "process",
      "bulletPoints": [],
      "notifications": [
        {"id": "notif-5", "type": "warning", "message": "Limited to 3 retry attempts"}
      ]
    },
    {
      "id": "success",
      "label": "Payment confirmed",
      "laneIndex": 0,
      "laneName": "",
      "type": "end",
      "bulletPoints": [],
      "notifications": [
        {"id": "notif-6", "type": "positive", "message": "Instant confirmation"}
      ]
    },
    {
      "id": "fail",
      "label": "Payment failed",
      "laneIndex": 0,
      "laneName": "",
      "type": "end",
      "bulletPoints": [],
      "notifications": [
        {"id": "notif-7", "type": "pain-point", "message": "User sees generic error message"}
      ]
    }
  ],
  "edges": [
    {"source": "start", "target": "validate", "label": "", "data": {"label": ""}},
    {"source": "validate", "target": "process", "label": "", "data": {"label": ""}},
    {"source": "process", "target": "success", "label": "Success", "data": {"label": "Success"}},
    {"source": "process", "target": "retry", "label": "Decline", "data": {"label": "Decline"}},
    {"source": "retry", "target": "process", "label": "", "data": {"label": ""}},
    {"source": "retry", "target": "fail", "label": "Max retries", "data": {"label": "Max retries"}}
  ],
  "audit": {"arrowCountDetected": 6, "edgeCountReturned": 6, "hasCycles": false}
}

Key observations for branching:
- Vertical layout detected (nodes flow top-to-bottom)
- No swim lanes (laneIndex: 0 for all)
- Main path edges have empty labels: start→validate, validate→process, retry→process
- Conditional branch edges have descriptive labels: "Success", "Decline", "Max retries"
- The layout calculator will use these labels to determine layout:
  * Unlabeled edges = continue straight down (main path)
  * Labeled edges = diverge to the right (branch/conditional)
- This creates a decision tree structure with proper branching visualization

Available roles (for lane labels and semantic hints)
${rolesList}

**Final Reminders:**
1. **CRITICAL:** Do NOT calculate positions (x, y). ONLY extract content and connections.
2. Count arrows first, trace each one carefully, verify your count matches. Edge detection is the most critical part!
3. Keep node labels complete - do NOT split descriptive text into bulletPoints unless there are explicit bullets/numbers visible
4. Empty arrays [] for bulletPoints and notifications are expected and correct when nothing is visible
5. Focus on WHAT the nodes are (content) and HOW they connect (edges), not WHERE they are (positions)

Return only the JSON object, no extra text.`
}

// Export with default fallback roles
export const DIAGRAM_TO_JOURNEY_PROMPT = generateDiagramToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

