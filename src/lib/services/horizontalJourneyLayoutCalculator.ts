/**
 * Horizontal Journey Layout Calculator
 * Calculates node positions for horizontal (left-to-right) user journey diagrams
 * Focuses specifically on swim lane layouts with chronological flow
 * 
 * Separation of Concerns:
 * - AI Prompt: Detects content (nodes, edges, lanes)
 * - This Calculator: Positions nodes based on edges and swim lanes
 */

interface NodeData {
  id: string
  swimLane?: string
  [key: string]: any
}

interface Edge {
  source: string
  target: string
}

interface CalculatedPosition {
  x: number
  y: number
}

interface LayoutResult {
  nodes: Array<NodeData & { position: CalculatedPosition }>
  swimLaneOrder: string[]
  swimLaneWidth?: number
  swimLaneHeight?: number
}

/**
 * Calculate horizontal layout positions for nodes
 * @param nodes - Array of nodes with content but no positions
 * @param edges - Array of edges defining parent-child relationships
 * @returns Positioned nodes with swim lane dimensions
 */
export function calculateHorizontalJourneyLayout(
  nodes: NodeData[],
  edges: Edge[]
): LayoutResult {
  // Constants for horizontal layout
  const NODE_WIDTH = 320
  const NODE_HEIGHT = 120 // Approximate node height
  const HORIZONTAL_GAP = 40
  const VERTICAL_GAP_BETWEEN_LANES = 24
  const SWIM_LANE_HEIGHT = 300 // Height of each swim lane
  const START_X = 40
  const START_Y = 40
  
  // Step 1: Build adjacency map (parent -> children)
  const childrenMap = new Map<string, Set<string>>()
  const parentsMap = new Map<string, Set<string>>()
  
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, new Set())
    }
    childrenMap.get(edge.source)!.add(edge.target)
    
    if (!parentsMap.has(edge.target)) {
      parentsMap.set(edge.target, new Set())
    }
    parentsMap.get(edge.target)!.add(edge.source)
  })
  
  // Step 2: Find start nodes (nodes with no incoming edges)
  const startNodes = nodes.filter(node => !parentsMap.has(node.id) || parentsMap.get(node.id)!.size === 0)
  
  // Step 3: Calculate X positions using BFS (chronological order)
  const xPositions = new Map<string, number>()
  const queue: string[] = []
  const visited = new Set<string>()
  
  // Initialize start nodes at START_X
  startNodes.forEach(node => {
    xPositions.set(node.id, START_X)
    queue.push(node.id)
    visited.add(node.id)
  })
  
  // BFS to calculate positions
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const currentX = xPositions.get(currentId)!
    
    // Get children
    const children = childrenMap.get(currentId) || new Set()
    
    children.forEach(childId => {
      // Calculate child X position: parent X + NODE_WIDTH + HORIZONTAL_GAP
      const childX = currentX + NODE_WIDTH + HORIZONTAL_GAP
      
      // If child already has a position, use the maximum (in case of multiple parents)
      if (xPositions.has(childId)) {
        xPositions.set(childId, Math.max(xPositions.get(childId)!, childX))
      } else {
        xPositions.set(childId, childX)
      }
      
      // Add to queue if not visited
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push(childId)
      }
    })
  }
  
  // Step 4: Calculate swim lane width based on total number of nodes
  // Width = (NODE_WIDTH + HORIZONTAL_GAP) × total nodes + HORIZONTAL_GAP (extra gap at end)
  const totalNodes = nodes.length
  const swimLaneWidth = (NODE_WIDTH + HORIZONTAL_GAP) * totalNodes + HORIZONTAL_GAP
  
  // Step 5: Identify unique swim lanes and order them
  const swimLanes = new Set<string>()
  nodes.forEach(node => {
    if (node.swimLane) {
      swimLanes.add(node.swimLane)
    }
  })
  
  const swimLaneOrder = Array.from(swimLanes)
  
  // Step 6: Calculate Y positions based on swim lanes with vertical gaps
  const yPositions = new Map<string, number>()
  const swimLaneYMap = new Map<string, number>()
  
  // Calculate vertical center offset within each lane
  const verticalCenterOffset = (SWIM_LANE_HEIGHT / 2) - (NODE_HEIGHT / 2)
  
  // Assign Y coordinates to swim lanes with gaps between them
  swimLaneOrder.forEach((lane, index) => {
    // Each lane starts at: START_Y + (index × (SWIM_LANE_HEIGHT + VERTICAL_GAP))
    const laneStartY = START_Y + (index * (SWIM_LANE_HEIGHT + VERTICAL_GAP_BETWEEN_LANES))
    // Position nodes in the vertical middle of the lane
    const nodeY = laneStartY + verticalCenterOffset
    swimLaneYMap.set(lane, nodeY)
  })
  
  // Assign Y to nodes based on their swim lane
  nodes.forEach(node => {
    if (node.swimLane && swimLaneYMap.has(node.swimLane)) {
      yPositions.set(node.id, swimLaneYMap.get(node.swimLane)!)
    } else {
      // Default Y if no swim lane (vertically centered in first lane)
      yPositions.set(node.id, START_Y + verticalCenterOffset)
    }
  })
  
  // Step 7: Assign positions to nodes, handling nodes without edges
  const positionedNodes = nodes.map(node => {
    let x = xPositions.get(node.id)
    let y = yPositions.get(node.id)
    
    // If node has no position (orphaned), place it at default
    if (x === undefined) {
      x = START_X
    }
    if (y === undefined) {
      y = START_Y + verticalCenterOffset
    }
    
    return {
      ...node,
      position: {
        x: snapToGrid(x, 8),
        y: snapToGrid(y, 8)
      }
    }
  })
  
  return {
    nodes: positionedNodes,
    swimLaneOrder,
    swimLaneWidth,
    swimLaneHeight: SWIM_LANE_HEIGHT
  }
}

/**
 * Snap value to nearest grid multiple
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

