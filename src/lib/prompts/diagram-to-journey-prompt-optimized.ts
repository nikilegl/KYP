/**
 * OPTIMIZED: Diagram-to-Journey Prompt (50% shorter, faster processing)
 * Extracts content from diagrams without calculating positions
 */

export const generateDiagramToJourneyPrompt = (userRoleNames: string[]): string => {
  const rolesList = userRoleNames.length > 0 
    ? userRoleNames.map(name => `"${name}"`).join(', ')
    : '"End Client", "Admin", "Developer"'
  
  return `Analyze this user journey diagram. Extract content ONLY (no positions).

Return valid JSON:
{
  "name": "string",
  "layout": "horizontal|vertical",
  "lanes": [{"index": 0, "label": "string"}],
  "nodes": [{
    "id": "string",
    "label": "string",
    "laneIndex": 0,
    "laneName": "string",
    "type": "start|process|end|label",
    "userRole": "string",
    "platform": "End client|CMS|Legl|Back end|Custom",
    "customPlatformName": "string",
    "bulletPoints": ["string"],
    "notifications": [{"id": "string", "type": "pain-point|warning|info|positive", "message": "string"}]
  }],
  "edges": [{"source": "string", "target": "string", "label": "string", "data": {"label": "string"}}]
}

CRITICAL RULES:
1. Do NOT output positions (x, y, width, height) - handled separately
2. ONLY extract: labels, types, connections, bullet points, notifications

LAYOUT DETECTION:
* **Vertical:** Arrows connect TOP/BOTTOM. If vertical → "lanes": []
* **Horizontal:** Arrows connect LEFT/RIGHT. Detect swim lanes.

EDGE DETECTION:
* Trace EVERY arrow carefully
* Conditional edges: detect branch labels ("Yes", "No", "If X")
* Main path edges: leave label empty
* Set both "label" and "data.label" to same value

NODE TYPES:
* start: First step(s)
* process: Middle steps
* end: Final step(s)  
* label: Text boxes with no connectors

BULLET POINTS:
* Extract sub-steps, actions listed under nodes
* Keep concise, one per line
* Do NOT split descriptive text into bullets

NOTIFICATIONS:
* pain-point: Red indicators, problems, frustrations
* warning: Yellow/orange cautions
* info: Blue/gray information
* positive: Green success, benefits

SWIM LANES (horizontal only):
* Detect horizontal bands/rows
* Label from diagram or number sequentially
* Set node's "laneName" to match lane label

USER ROLES:
Available: ${rolesList}
Match to closest role or leave empty.

PLATFORMS:
"End client", "CMS", "Legl", "Back end", "Custom"
If "Custom", put name in "customPlatformName".

AUDIT:
Count arrows vs edges, check for cycles.

Example (horizontal):
{
  "name": "Purchase Flow",
  "layout": "horizontal",
  "lanes": [{"index": 0, "label": "Customer"}, {"index": 1, "label": "System"}],
  "nodes": [
    {"id": "1", "label": "Browse products", "laneIndex": 0, "laneName": "Customer", "type": "start", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": [], "notifications": []},
    {"id": "2", "label": "Add to cart", "laneIndex": 0, "laneName": "Customer", "type": "process", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": ["Select quantity", "Choose options"], "notifications": []},
    {"id": "3", "label": "Validate stock", "laneIndex": 1, "laneName": "System", "type": "process", "userRole": "", "platform": "Back end", "customPlatformName": "", "bulletPoints": [], "notifications": [{"id": "n1", "type": "pain-point", "message": "Slow validation"}]},
    {"id": "4", "label": "Payment", "laneIndex": 0, "laneName": "Customer", "type": "process", "userRole": "End Client", "platform": "Custom", "customPlatformName": "Stripe", "bulletPoints": [], "notifications": []},
    {"id": "5", "label": "Confirmation", "laneIndex": 0, "laneName": "Customer", "type": "end", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": [], "notifications": [{"id": "n2", "type": "positive", "message": "Order confirmed"}]}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "", "data": {"label": ""}},
    {"source": "2", "target": "3", "label": "", "data": {"label": ""}},
    {"source": "3", "target": "4", "label": "In stock", "data": {"label": "In stock"}},
    {"source": "3", "target": "5", "label": "Out of stock", "data": {"label": "Out of stock"}},
    {"source": "4", "target": "5", "label": "", "data": {"label": ""}}
  ]
}

Example (vertical):
{
  "name": "Login Flow",
  "layout": "vertical",
  "lanes": [],
  "nodes": [
    {"id": "1", "label": "Enter credentials", "laneIndex": 0, "laneName": "", "type": "start", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": ["Email", "Password"], "notifications": []},
    {"id": "2", "label": "Validate", "laneIndex": 0, "laneName": "", "type": "process", "userRole": "", "platform": "Back end", "customPlatformName": "", "bulletPoints": [], "notifications": []},
    {"id": "3", "label": "Success", "laneIndex": 0, "laneName": "", "type": "end", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": [], "notifications": [{"id": "n1", "type": "positive", "message": "Logged in"}]},
    {"id": "4", "label": "Error", "laneIndex": 0, "laneName": "", "type": "end", "userRole": "End Client", "platform": "End client", "customPlatformName": "", "bulletPoints": [], "notifications": [{"id": "n2", "type": "pain-point", "message": "Login failed"}]}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "", "data": {"label": ""}},
    {"source": "2", "target": "3", "label": "Valid", "data": {"label": "Valid"}},
    {"source": "2", "target": "4", "label": "Invalid", "data": {"label": "Invalid"}}
  ]
}

FINAL REMINDERS:
* Extract ALL nodes and edges
* Match user roles when possible
* Detect notifications from visual indicators
* No positions - just content and connections
* Return only valid JSON`
}

