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

Extract:

1. **Nodes**: Each box/shape/card in the diagram representing a step
   - id: Generate a unique identifier (e.g., "node-1", "node-2")
   - type: Determine if it's "start" (first step), "process" (middle step), or "end" (final step)
   - position: Extract x,y coordinates based on visual layout. Measure relative positions from top-left.
     * Use the actual spacing you see in the diagram
     * Snap to 15px grid (multiples of 15): Valid values: 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150...
     * Try to preserve the visual layout as accurately as possible
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

2. **Edges**: Connections/arrows between nodes
   - id: Generate unique identifier (e.g., "edge-1-2")
   - source: The id of the source node
   - target: The id of the target node
   - type: Always "custom"
   - label: Any text on or near the arrow/connection (empty string if none)
   - data: Object with:
     * label: Same as top-level label

3. **Regions**: Highlighted background areas/groups (often colored boxes containing multiple nodes)
   - id: Generate unique identifier (e.g., "region-1", "region-2")
   - type: Always "highlightRegion"
   - position: x,y coordinates of top-left corner (snapped to 15px grid)
   - style: Object with:
     * width: Width in pixels (snapped to 15px grid, typically 600-900)
     * height: Height in pixels (snapped to 15px grid, typically 400-600)
     * zIndex: Always -1 (renders behind nodes)
   - data: Object with:
     * label: The title/label of the region (e.g., "Authentication Flow", "Payment Process")
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

Guidelines:

LAYOUT ANALYSIS:
- Carefully observe the visual arrangement of nodes in the diagram
- Measure relative positions as accurately as possible
- GRID SNAPPING: All x, y, width, height values MUST be multiples of 15
- Preserve the general flow direction (horizontal vs vertical)
- If nodes flow left-to-right primarily: set layout to "horizontal" and journeyLayout to "horizontal"
- If nodes flow top-to-bottom primarily: set layout to "vertical" and journeyLayout to "vertical"
- Typical spacing: 
  * Horizontal layouts: 350-450px between nodes horizontally
  * Vertical layouts: 240-300px between nodes vertically
  * Nodes are typically 320px wide and 100-150px tall

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

EDGE LABELS:
- Only include labels if text is visible on or near the arrow
- Common labels: "Yes", "No", "Success", "Error", "If X then", conditional paths
- Empty string "" for unlabeled connections

NODE-TO-REGION RELATIONSHIP:
- After creating regions, check which nodes are visually inside each region
- For nodes inside regions, add "parentId" property with the region's id
- Node positions should be relative to the region's position when they have a parentId
- Add "extent": "parent" to prevent dragging outside the region

FINAL CHECKS:
- All coordinates must be multiples of 15
- All nodes must have complete data objects with all required fields
- Include empty arrays [] for bulletPoints and notifications if none detected
- Include empty object {} for customProperties
- Regions come FIRST in the JSON (before nodes) for proper rendering order
- Double-check that nodes inside regions have parentId and relative positions

Return ONLY the JSON object, no other text.`
}

// Export with default fallback roles
export const DIAGRAM_TO_JOURNEY_PROMPT = generateDiagramToJourneyPrompt([
  'End Client', 'Admin', 'Developer'
])

