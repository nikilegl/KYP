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
  
  return `You are analyzing a user journey diagram image (possibly from Miro, Figma, or similar tools). Extract the following information and return it as valid JSON:

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.

🎯 PRIMARY GOAL: Detect the STRUCTURE and FLOW of the diagram, then calculate positions.

**THREE-PHASE APPROACH:**

**PHASE 1 - DETECT CONNECTIONS (HIGHEST PRIORITY):**
- Identify ALL arrows/edges in the diagram FIRST
- For each arrow, determine:
  * Which node it starts from (source/parent)
  * Which node it points to (target/child)
- This defines the parent-child relationships and flow order
- Get this right - everything else depends on accurate edge detection!

**PHASE 2 - DETECT Y COORDINATES (SWIM LANES):**
- Identify all swim lanes (horizontal colored bands) in the diagram
- Count them: 2 lanes? 3 lanes? 4 lanes?
- Calculate Y coordinates with EVEN spacing:
  * First lane (top): y=96
  * Spacing between lanes: 304px
  * Formula: Y(lane) = 96 + (laneIndex × 304)
  * Example with 3 lanes:
    - Lane 1 (End Client): y=96
    - Lane 2 (GLP): y=96 + 304 = 400
    - Lane 3 (Denovo): y=96 + 608 = 704
- All nodes in same swim lane get the same Y coordinate
- Determine which lane each node visually belongs to and assign its Y value

**PHASE 3 - CALCULATE X COORDINATES (LEFT-TO-RIGHT FLOW):**
- Calculate X positions based on parent-child relationships from edges
- Start from leftmost node (no incoming edges) at x=96
- Each child node is positioned 360px to the RIGHT of its parent (40px gap)
- Formula: X(child) = X(parent) + 360
- Build left-to-right, following the edge connections
- **CRITICAL**: Ignore visual spacing in diagram - use systematic 360px spacing between parent and child

 SWIM LANE DIAGRAMS
If the diagram has horizontal colored bands (swim lanes) with labels like "End Client", "GLP", "Denovo":
- This is a HORIZONTAL SWIM LANE diagram
- Each colored band is a REGION that must be detected and created
- Nodes in the SAME swim lane (same colored row) should have the SAME Y position
- Example: If "End Client" has 4 nodes, they should all have y=100 (or similar), and different x positions
- Each swim lane is a separate horizontal ROW with distinct Y position
- Example Y positions: End Client row at y=100, GLP row at y=400, Denovo row at y=700
- Nodes flow LEFT TO RIGHT within their row
- **CRITICAL**: Nodes inside a swim lane MUST have 'parentId' set to that swim lane's region ID

🎯 X-COORDINATE CALCULATION METHOD (CRITICAL):

**DO NOT measure visual spacing - CALCULATE based on connections!**

**Step-by-step process:**

1. **Identify the starting node(s):**
   - Find node(s) with NO incoming edges (these are the start nodes)
   - Assign them x=96

2. **Build left-to-right using edges:**
   - For each edge from parent to child:
     * X(child) = X(parent) + 360
   - Where 360 = 320px (node width) + 40px (gap)

3. **Handle multiple parents:**
   - If a node has multiple incoming edges (multiple parents):
     * Calculate X based on the rightmost parent
     * X(child) = max(X of all parents) + 360

4. **Example calculation:**
   - Node A (start, no incoming edges): x=96
   - Edge: A → B: x(B) = 96 + 360 = 456
   - Edge: B → C: x(C) = 456 + 360 = 816
   - Edge: B → D: x(D) = 456 + 360 = 816
   - If Edge: A → C also exists: x(C) = max(96+360, 456+360) = 816 (use the larger value)

**IMPORTANT:**
- Node width = 320px
- Standard gap = 40px
- Spacing between parent and child = 360px (ALWAYS)
- Ignore visual spacing in the diagram - use consistent 360px gaps

Extract:

1. **Nodes**: Each box/shape/card in the diagram representing a step
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - type: Determine if it's "start" (first step), "process" (middle step), or "end" (final step)
   - position: Calculate x,y coordinates using the THREE-PHASE APPROACH:
     * **Y COORDINATE (from swim lanes):**
       - Count total number of swim lanes in diagram (e.g., 3 lanes)
       - Determine which swim lane the node visually belongs to (lane 1, lane 2, or lane 3 from top)
       - Calculate Y using formula: Y = 96 + (laneIndex × 304)
         • Lane 1 (top): y=96
         • Lane 2: y=400 (96 + 304)
         • Lane 3: y=704 (96 + 608)
         • Lane 4: y=1008 (96 + 912) if 4 lanes exist
       - All nodes in same swim lane have identical Y values
     
     * **X COORDINATE (calculated from edges):**
       - Start nodes (no incoming edges): x=96
       - For each child node: X(child) = X(parent) + 360
       - If multiple parents: X(child) = max(X of all parents) + 360
       - DO NOT measure from image - CALCULATE from parent-child relationships
     
     * **Snap to 8px grid** (multiples of 8 only): 0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104...
       - After calculation, round to nearest multiple of 8
       - Example: 96, 456 (96+360), 816 (456+360)
   - data: An object containing:
     * label: The main text/title of this step
     * type: Same as the top-level type ("start", "process", or "end")
     * userRole: The EXACT role name performing this step. Available roles: ${rolesList}
       IMPORTANT: Match exact casing from available roles. Choose closest match. If unsure, use first role.
     * variant: Platform mentioned - one of: "CMS", "Legl", "End client", "Back end", "Third party", or ""
     * thirdPartyName: If variant is "Third party", include service name (e.g., "Stripe", "Auth0", "Slack"). Otherwise ""
     * bulletPoints: Array of any sub-steps, actions, or details listed in the node
     * notifications: Array of notifications. Look for pain points, warnings, issues, or positive notes:
       - id: Generate unique ID (e.g., "notif-1")
       - type: One of "pain-point", "warning", "info", "positive"
         * "pain-point": User frustrations, problems, blockers, issues (often marked in red)
         * "warning": Cautions, edge cases, potential problems (often in yellow/orange)
         * "info": Additional information, notes, FYI items (often in gray/blue)
         * "positive": Successes, wins, good outcomes (often in green)
       - message: The text of the notification
     * customProperties: Empty object {}
     * journeyLayout: Analyze overall diagram flow. Set to "horizontal" if nodes flow primarily left-to-right, "vertical" if top-to-bottom

2. **Edges**: Connections/arrows between nodes (⚠️ PHASE 1 - DO THIS FIRST!)
   - **THIS IS THE MOST CRITICAL PART - Edge detection determines everything else!**
   - CAREFULLY examine the diagram and identify EVERY arrow/line
   - For each arrow:
     * Trace from START point (source/parent node)
     * Trace to END point (target/child node)
     * These connections define the flow and will be used to calculate X positions
   - Do NOT assume sequential flow - only record visible arrows
   - In swim lane diagrams, arrows cross between lanes (up/down)
   - Count arrows carefully - if you see 5 arrows, you must create 5 edges
   
   - id: Generate unique identifier (e.g., "edge-1-2", "edge-2-3")
   - source: The id of the source node (where the arrow STARTS - this is the PARENT)
   - target: The id of the target node (where the arrow ENDS - this is the CHILD)
   - type: Always "custom"
   - label: Any text on or near the arrow/connection (empty string if none)
   - data: Object with:
     * label: Same as top-level label
   
   **REMEMBER**: These edges determine X positions! Source nodes will be left of target nodes.

3. **Regions**: Swim lane regions (horizontal colored bands containing nodes)
   - **For swim lane diagrams, create one region per lane with EVEN spacing**
   - id: Generate unique identifier (e.g., "region-end-client", "region-glp", "region-denovo")
   - type: Always "highlightRegion"
   - position: Calculate x,y coordinates with EVEN spacing:
     * x: Always 0 (regions span from left edge)
     * y: Calculate using formula: Y = (laneIndex × 304)
       - Lane 1: y=0 (0×304)
       - Lane 2: y=304 (1×304)
       - Lane 3: y=608 (2×304)
       - Lane 4: y=912 (3×304) if 4 lanes
   - style: Object with:
     * width: Full diagram width (e.g., 2400px - wide enough for all nodes)
     * height: 304 (EVEN spacing - each lane is 304px tall)
     * zIndex: Always -1 (renders behind nodes)
   - data: Object with:
     * label: The swim lane name from diagram (e.g., "End Client", "GLP", "Denovo")
     * backgroundColor: Detect from image color. Map to closest:
       "#fef3c7" (yellow), "#dbeafe" (blue), "#d1fae5" (green), "#fee2e2" (red), 
       "#f3e8ff" (purple), "#e0e7ff" (indigo), "#fce7f3" (pink), "#e5e7eb" (gray)
     * borderColor: Corresponding border color:
       "#fbbf24" (yellow), "#3b82f6" (blue), "#10b981" (green), "#ef4444" (red),
       "#a855f7" (purple), "#6366f1" (indigo), "#ec4899" (pink), "#9ca3af" (gray)
   - draggable: true
   - selectable: true

4. **Metadata**:
   - name: Title of the journey if visible in the diagram
   - description: Any subtitle or description text
   - layout: Overall journey layout direction ("vertical" or "horizontal")

Return format:
{
  "name": "Journey Name",
  "description": "Journey description",
  "layout": "vertical",
  "regions": [
    {
      "id": "region-1",
      "type": "highlightRegion",
      "position": {"x": 75, "y": 75},
      "style": {
        "width": 600,
        "height": 450,
        "zIndex": -1
      },
      "data": {
        "label": "Authentication Flow",
        "backgroundColor": "#dbeafe",
        "borderColor": "#3b82f6"
      },
      "draggable": true,
      "selectable": true
    }
  ],
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "position": {"x": 105, "y": 105},
      "data": {
        "label": "User opens app",
        "type": "start",
        "userRole": "End Client",
        "variant": "End client",
        "thirdPartyName": "",
        "bulletPoints": ["Launch application", "See landing page"],
        "notifications": [
          {
            "id": "notif-1",
            "type": "pain-point",
            "message": "Slow loading time frustrates users"
          }
        ],
        "customProperties": {},
        "journeyLayout": "vertical"
      }
    },
    {
      "id": "node-2",
      "type": "process",
      "position": {"x": 105, "y": 360},
      "data": {
        "label": "Authenticate with OAuth",
        "type": "process",
        "userRole": "End Client",
        "variant": "Third party",
        "thirdPartyName": "Auth0",
        "bulletPoints": ["Click sign in", "Redirect to Auth0", "Enter credentials"],
        "notifications": [],
        "customProperties": {},
        "journeyLayout": "vertical"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1-2",
      "source": "node-1",
      "target": "node-2",
      "type": "custom",
      "label": "",
      "data": {
        "label": ""
      }
    }
  ]
}

SWIM LANE EXAMPLE (for horizontal swim lane diagrams):
{
  "name": "Client Onboarding Process",
  "description": "Multi-system onboarding flow",
  "layout": "horizontal",
  "regions": [
    {
      "id": "region-end-client",
      "type": "highlightRegion",
      "position": {"x": 0, "y": 0},
      "style": {"width": 2400, "height": 304, "zIndex": -1},
      "data": {
        "label": "End Client",
        "backgroundColor": "#fef3c7",
        "borderColor": "#fbbf24"
      },
      "draggable": true,
      "selectable": true
    },
    {
      "id": "region-glp",
      "type": "highlightRegion",
      "position": {"x": 0, "y": 304},
      "style": {"width": 2400, "height": 304, "zIndex": -1},
      "data": {
        "label": "GLP",
        "backgroundColor": "#dbeafe",
        "borderColor": "#3b82f6"
      },
      "draggable": true,
      "selectable": true
    },
    {
      "id": "region-denovo",
      "type": "highlightRegion",
      "position": {"x": 0, "y": 608},
      "style": {"width": 2400, "height": 304, "zIndex": -1},
      "data": {
        "label": "Denovo",
        "backgroundColor": "#f3e8ff",
        "borderColor": "#a855f7"
      },
      "draggable": true,
      "selectable": true
    }
  ],
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "parentId": "region-end-client",
      "extent": "parent",
      "position": {"x": 96, "y": 96},
      "data": {
        "label": "Client accepts offer",
        "type": "start",
        "userRole": "End Client",
        "journeyLayout": "horizontal"
      }
    },
    {
      "id": "node-2",
      "type": "process",
      "parentId": "region-end-client",
      "extent": "parent",
      "position": {"x": 1176, "y": 96},
      "data": {
        "label": "Client prints and signs Terms",
        "type": "process",
        "userRole": "End Client",
        "journeyLayout": "horizontal"
      }
    },
    {
      "id": "node-3",
      "type": "process",
      "parentId": "region-end-client",
      "extent": "parent",
      "position": {"x": 1536, "y": 96},
      "data": {
        "label": "Client completes questionnaire",
        "type": "process",
        "userRole": "End Client",
        "journeyLayout": "horizontal"
      }
    },
    {
      "id": "node-4",
      "type": "process",
      "parentId": "region-end-client",
      "extent": "parent",
      "position": {"x": 1896, "y": 96},
      "data": {
        "label": "Client completes Amiqus check",
        "type": "process",
        "userRole": "End Client",
        "journeyLayout": "horizontal"
      }
    },
    {
      "id": "node-5",
      "type": "process",
      "parentId": "region-glp",
      "extent": "parent",
      "position": {"x": 600, "y": 400},
      "data": {
        "label": "Send documents via email",
        "type": "process",
        "userRole": "GLP",
        "journeyLayout": "horizontal"
      }
    },
    {
      "id": "node-6",
      "type": "process",
      "parentId": "region-denovo",
      "extent": "parent",
      "position": {"x": 96, "y": 704},
      "data": {
        "label": "Offer saved to Denovo",
        "type": "process",
        "userRole": "Denovo",
        "journeyLayout": "horizontal"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1-6",
      "source": "node-1",
      "target": "node-6",
      "type": "custom",
      "label": "",
      "data": {"label": ""}
    },
    {
      "id": "edge-6-5",
      "source": "node-6",
      "target": "node-5",
      "type": "custom",
      "label": "",
      "data": {"label": ""}
    },
    {
      "id": "edge-5-2",
      "source": "node-5",
      "target": "node-2",
      "type": "custom",
      "label": "",
      "data": {"label": ""}
    },
    {
      "id": "edge-2-3",
      "source": "node-2",
      "target": "node-3",
      "type": "custom",
      "label": "",
      "data": {"label": ""}
    },
    {
      "id": "edge-3-4",
      "source": "node-3",
      "target": "node-4",
      "type": "custom",
      "label": "",
      "data": {"label": ""}
    }
  ]
}

Note: In this example - OBSERVE THE THREE-PHASE APPROACH:

**PHASE 1 - EDGES DETECTED:**
- Edge 1-6: "Client accepts offer" → "Offer saved to Denovo"
- Edge 6-5: "Offer saved to Denovo" → "Send documents via email"
- Edge 5-2: "Send documents via email" → "Client prints and signs Terms"
- Edge 2-3: "Client prints and signs Terms" → "Client completes questionnaire"
- Edge 3-4: "Client completes questionnaire" → "Client completes Amiqus check"
- Total: 5 edges creating a linear flow across swim lanes

**PHASE 2 - Y COORDINATES FROM SWIM LANES:**
- Node 1: Visually in End Client (yellow) → y=96
- Node 6: Visually in Denovo (purple) → y=704
- Node 5: Visually in GLP (blue) → y=400
- Nodes 2, 3, 4: Visually in End Client (yellow) → y=96
- ALL nodes in same swim lane get same Y coordinate

**PHASE 3 - X COORDINATES CALCULATED FROM EDGES:**
- Node 1 (no incoming edges = start): x=96
- Node 6 (child of node 1): x = 96 + 360 = 456
- Node 5 (child of node 6): x = 456 + 360 = 816
- Node 2 (child of node 5): x = 816 + 360 = 1176
- Node 3 (child of node 2): x = 1176 + 360 = 1536
- Node 4 (child of node 3): x = 1536 + 360 = 1896
- Each child is exactly 360px to the right of its parent

**NODE ASSIGNMENTS (parentId):**
- Nodes 1, 2, 3, 4 have parentId: "region-end-client" (Y=96 falls in End Client region 0-304)
- Node 5 has parentId: "region-glp" (Y=400 falls in GLP region 304-608)
- Node 6 has parentId: "region-denovo" (Y=704 falls in Denovo region 608-912)
- ALL nodes have extent: "parent"
- **Region boundaries with EVEN 304px spacing:**
  * Region 1: y=0 to y=304 (height 304px)
  * Region 2: y=304 to y=608 (height 304px)
  * Region 3: y=608 to y=912 (height 304px)

**KEY INSIGHT:**
- Edges define the flow: 1→6→5→2→3→4
- X positions build left-to-right following this flow
- Y positions determined by which swim lane each node visually belongs to
- Result: Nodes flow left-to-right with consistent 360px spacing, crossing between swim lanes

Guidelines:

📋 WORKFLOW SUMMARY - Follow this exact order:

**STEP 1: DETECT ALL EDGES FIRST (Most Critical!)**
1. Examine the entire diagram for arrows/lines
2. Count them - if you see 5 arrows, you need 5 edges
3. For each arrow:
   - Identify source node (where arrow starts)
   - Identify target node (where arrow ends)
   - Record edge: source → target
4. Double-check: Did I find ALL arrows?

**STEP 2: DETERMINE Y COORDINATES**
1. Count total number of swim lanes (horizontal colored bands)
2. For each node, determine which swim lane it's in (counting from top: 1, 2, 3...)
3. Calculate Y coordinate using formula: Y = 96 + (laneIndex × 304)
   - Lane 1 (top, e.g., End Client): y=96 (96 + 0×304)
   - Lane 2 (e.g., GLP): y=400 (96 + 1×304)
   - Lane 3 (e.g., Denovo): y=704 (96 + 2×304)
   - Lane 4 (if exists): y=1008 (96 + 3×304)
4. All nodes in same lane get same Y value

**STEP 3: CALCULATE X COORDINATES**
1. Find start node(s): nodes with NO incoming edges
2. Assign start nodes: x=96
3. For each edge (parent → child):
   - X(child) = X(parent) + 360
4. If node has multiple parents:
   - X(child) = max(X of all parents) + 360
5. Build left-to-right following the edge flow

**STEP 4: ASSIGN TO REGIONS**
1. Create swim lane regions
2. For each node, check its Y position
3. Assign parentId to the region containing that Y position
4. Set extent: "parent"

**LAYOUT DIRECTION:**
- If nodes flow left-to-right primarily: set layout to "horizontal" and journeyLayout to "horizontal"
- If nodes flow top-to-bottom primarily: set layout to "vertical" and journeyLayout to "vertical"

SPACING REQUIREMENTS:
- Node width: 320px
- Horizontal gap: 40px
- Total spacing parent to child: 360px (ALWAYS)
- Horizontal formula: X(child) = X(parent) + 360
- Vertical spacing between swim lanes: 304px (EVEN spacing)
- Vertical formula: Y(lane) = 96 + (laneIndex × 304)
- All coordinates must snap to multiples of 8

SWIM LANE ROW POSITIONING (CRITICAL FOR SWIM LANE DIAGRAMS):
- If the diagram shows horizontal swim lanes (colored horizontal bands):
  * Count total number of lanes
  * Calculate Y for each lane using: Y = 96 + (laneIndex × 304)
  * All nodes in the SAME swim lane MUST have the EXACT SAME Y position
  * Example with 3 lanes:
    - Lane 1 "End Client": all nodes at y=96
    - Lane 2 "GLP": all nodes at y=400
    - Lane 3 "Denovo": all nodes at y=704
  * Example with 4 lanes:
    - Lane 1: y=96, Lane 2: y=400, Lane 3: y=704, Lane 4: y=1008
- Swim lanes have EVEN spacing: 304px apart vertically
- Within each swim lane, nodes flow horizontally (left to right)
- DO NOT vary Y positions within the same swim lane

REGION DETECTION:
- Look for colored background areas, boxes, or grouped sections
- Regions often have labels like "Phase 1", "Authentication", "Checkout Flow", etc.
- Regions should encompass all nodes within their visual boundary
- Region position should be slightly above and to the left of contained nodes (padding ~30px)
- Region size should contain all child nodes with some padding
- If nodes are inside a region, they should have parentId set to the region's id
- Common region colors in diagrams: yellow (warnings/planning), blue (information), green (success/complete), red (errors/critical)

PAIN POINT DETECTION (CRITICAL):
- Look for indicators of user frustration, problems, or difficulties
- Visual cues: red text, warning symbols, exclamation marks, sad faces
- Text cues: "pain point", "problem", "issue", "frustrating", "slow", "confusing", "difficult", "error"
- Create notifications with type "pain-point" for these
- Extract the specific problem description as the message

NOTIFICATION TYPES:
- "pain-point": Problems, frustrations, blockers, errors (look for red markers, ❌, ⚠️, problems)
- "warning": Cautions, edge cases, "watch out for" (look for yellow/orange markers)
- "info": Additional context, notes, FYI (look for blue markers, ℹ️, notes)
- "positive": Wins, successes, improvements (look for green markers, ✓, success indicators)

USER ROLE DETECTION:
- Look for swim lanes, role labels, or actor names
- Common patterns: "User:", "Admin:", "System:", "Client:", "Developer:"
- Match to available roles: ${rolesList}
- Use EXACT casing from the available roles list
- If role isn't clear, infer from the action context

PLATFORM/VARIANT DETECTION:
- Look for system indicators: "CMS", "Backend", "Frontend", "Legl", "API"
- Look for third-party logos or names: Stripe, Auth0, Slack, Salesforce, etc.
- If third-party detected, set variant to "Third party" AND thirdPartyName to the service name

EDGE DETECTION (⚠️ PHASE 1 - HIGHEST PRIORITY):
- **DO THIS FIRST! Everything else depends on getting edges right!**
- This is where most errors occur - be extremely careful
- **Process:**
  1. Scan the ENTIRE diagram for ALL arrows/lines
  2. Count them (e.g., "I see 5 arrows total")
  3. For EACH arrow:
     * Identify START node (source/parent)
     * Identify END node (target/child)
     * Record: source → target
  4. Verify count: Created 5 edges for 5 arrows? ✓

- DO NOT create edges based on assumed flow - ONLY based on visible arrows
- In swim lane diagrams, arrows frequently cross between lanes (up/down)
- Example: If "Client accepts offer" has an arrow going DOWN to "Offer saved to Denovo", create edge: source="node-1", target="node-denovo"
- Common mistake: Creating edges between adjacent nodes that have no visible arrow

- **Why edges are critical:**
  * Edges define the parent-child relationships
  * X positions are calculated from edges: X(child) = X(parent) + 360
  * If edges are wrong, ALL X positions will be wrong
  * Get this right first, then move to Phase 2 (Y coordinates)

EDGE LABELS:
- Only include labels if text is visible on or near the arrow
- Common labels: "Yes", "No", "Success", "Error", "If X then", conditional paths
- Empty string "" for unlabeled connections

NODE-TO-REGION RELATIONSHIP (CRITICAL FOR SWIM LANES):
- **Step 1**: Create all swim lane regions FIRST with EVEN 304px spacing
  * Region Y positions: 0, 304, 608, 912... (laneIndex × 304)
  * Each region has height of 304px
- **Step 2**: For EACH node, determine which swim lane it belongs to:
  * Check the node's Y position
  * Find which region's Y range contains that Y position
  * With EVEN spacing:
    - Node Y=96 is in region 0-304 → "End Client"
    - Node Y=400 is in region 304-608 → "GLP"
    - Node Y=704 is in region 608-912 → "Denovo"
- **Step 3**: Set the node's 'parentId' to the region's ID
  * Example: "parentId": "region-end-client"
- **Step 4**: Set the node's 'extent' to "parent"
  * This keeps the node inside its swim lane region
- **CRITICAL**: In swim lane diagrams, EVERY node must have a parentId - no orphaned nodes!
- **COLOR MATCHING**: Use region colors to help identify which nodes belong where:
  * Yellow/beige nodes → "End Client" region (#fef3c7)
  * Blue nodes → "GLP" region (#dbeafe)  
  * Purple/pink nodes → "Denovo" region (#f3e8ff)

🔍 FINAL VERIFICATION - THREE-PHASE APPROACH:

**Before returning JSON, verify you followed all three phases:**

✅ **PHASE 1 COMPLETE?** - Edge Detection
  - Did I identify ALL arrows in the diagram?
  - Did I create an edge for each visible arrow?
  - Does my edge count match the arrow count?
  
✅ **PHASE 2 COMPLETE?** - Y Coordinates
  - Did I identify which swim lane each node belongs to?
  - Do all nodes in the same swim lane have the same Y value?
  - End Client: y=96, GLP: y=400, Denovo: y=704 (or similar pattern)
  
✅ **PHASE 3 COMPLETE?** - X Coordinates
  - Did I find start nodes (no incoming edges) and set them to x=96?
  - Did I calculate each child as: X(child) = X(parent) + 360?
  - Are all children to the RIGHT of their parents?
  - Is spacing consistent at 360px between connected nodes?

FINAL CHECKS:
- All coordinates must be multiples of 8
- All nodes must have complete data objects with all required fields
- Include empty arrays [] for bulletPoints and notifications if none detected
- Include empty object {} for customProperties
- **REGIONS FIRST**: Regions come FIRST in the JSON (before nodes) for proper rendering order
- **PARENTID CHECK (CRITICAL)**: For swim lane diagrams, verify EVERY node has a 'parentId' and 'extent: "parent"'
  * Count your nodes, count how many have parentId - numbers must match!
  * If any node is missing parentId, determine its swim lane from its Y position and add it
  * Example: Node at y=96 should have parentId: "region-end-client"
  * Example: Node at y=400 should have parentId: "region-glp"
  * Example: Node at y=704 should have parentId: "region-denovo"
- **EDGE VERIFICATION (CRITICAL)**: For each edge, verify you can SEE the arrow in the diagram connecting those exact two nodes
- **EDGE COUNT**: Count the arrows in the diagram - your edges array should have the same number
- **NO ASSUMED EDGES**: Do not create edges between adjacent nodes unless there's a visible arrow
- **X COORDINATE CALCULATION CHECK (CRITICAL)**: 
  * Start nodes (no incoming edges): x=96 ✓
  * For each edge (parent → child): X(child) = X(parent) + 360 ✓
  * Example: If parent at x=96, child should be at x=456 (96 + 360)
  * Example: If parent at x=456, child should be at x=816 (456 + 360)
  * Verify every child is exactly 360px to the right of its parent
- **PARENT-CHILD POSITIONING CHECK**: For each edge, verify child X > parent X
  * For edge from node A (source) to node B (target): X(B) MUST be greater than X(A)
  * If any child is not to the right of parent, recalculate using X(child) = X(parent) + 360
- **SWIM LANE Y-POSITION CHECK**: All nodes in the same swim lane have identical Y values
  * End Client nodes: all same Y (e.g., y=96)
  * GLP nodes: all same Y (e.g., y=400)
  * Denovo nodes: all same Y (e.g., y=704)
- **GRID SNAPPING**: All X and Y values are multiples of 8? (96, 104, 112, 120, 456, 464, 816, 824...)

Return ONLY the JSON object, no other text.`
}

// Export with default fallback roles
export const DIAGRAM_TO_JOURNEY_PROMPT = generateDiagramToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

