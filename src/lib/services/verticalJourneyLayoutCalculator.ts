/**
 * Vertical Journey Layout Calculator
 * Calculates node positions for vertical (top-to-bottom) user journey diagrams
 * Supports linear flows and branching/convergence patterns
 * 
 * Separation of Concerns:
 * - AI Prompt: Detects content (nodes, edges, labels)
 * - This Calculator: Positions nodes based on edges and flow patterns
 */

interface NodeData {
  id: string
  type?: string
  [key: string]: any
}

interface Edge {
  id: string
  source: string
  target: string
  label?: string
  data?: {
    label?: string
  }
}

interface CalculatedPosition {
  x: number
  y: number
}

interface LayoutResult {
  nodes: Array<NodeData & { position: CalculatedPosition }>
}

/**
 * Calculate vertical layout positions for nodes
 * @param nodes - Array of nodes with content but no positions
 * @param edges - Array of edges defining flow and branches
 * @returns Positioned nodes
 */
export function calculateVerticalJourneyLayout(
  nodes: NodeData[],
  edges: Edge[]
): LayoutResult {
  // Constants for vertical layout
  const GRID_SIZE = 8
  const BASE_X = 96 // Main vertical line X coordinate
  const BASE_Y = 96 // Starting Y coordinate
  const VERTICAL_GAP = 240 // Vertical spacing between nodes
  const BRANCH_X_OFFSET = 384 // Horizontal offset for branches (480 - 96)
  
  // Build adjacency maps
  const childrenMap = new Map<string, Set<string>>()
  const parentsMap = new Map<string, Set<string>>()
  const edgeLabelMap = new Map<string, string>() // Track edge labels for branch detection
  
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, new Set())
    }
    childrenMap.get(edge.source)!.add(edge.target)
    
    if (!parentsMap.has(edge.target)) {
      parentsMap.set(edge.target, new Set())
    }
    parentsMap.get(edge.target)!.add(edge.source)
    
    // Store edge labels for branch detection
    const edgeLabel = edge.label || edge.data?.label || ''
    if (edgeLabel) {
      edgeLabelMap.set(`${edge.source}->${edge.target}`, edgeLabel)
    }
  })
  
  // Find start nodes (nodes with no incoming edges)
  const startNodes = nodes.filter(node => 
    !parentsMap.has(node.id) || parentsMap.get(node.id)!.size === 0
  )
  
  // Position map
  const positions = new Map<string, CalculatedPosition>()
  const processed = new Set<string>()
  
  // Helper function to detect if a node is a branch point
  const isBranchPoint = (nodeId: string): boolean => {
    const children = childrenMap.get(nodeId)
    if (!children || children.size <= 1) return false
    
    // A node is a branch point if it has multiple children
    // AND at least one has a labeled edge (conditional path)
    let hasLabeledEdge = false
    children.forEach(childId => {
      if (edgeLabelMap.has(`${nodeId}->${childId}`)) {
        hasLabeledEdge = true
      }
    })
    
    return hasLabeledEdge
  }
  
  // Helper function to determine if an edge represents a branch (has label)
  const isBranchEdge = (sourceId: string, targetId: string): boolean => {
    return edgeLabelMap.has(`${sourceId}->${targetId}`)
  }
  
  // Layout algorithm using level-based positioning
  let currentY = BASE_Y
  const queue: Array<{ nodeId: string; x: number; y: number; isOnMainPath: boolean }> = []
  
  // Initialize start nodes
  startNodes.forEach(node => {
    positions.set(node.id, { x: BASE_X, y: currentY })
    queue.push({ nodeId: node.id, x: BASE_X, y: currentY, isOnMainPath: true })
    processed.add(node.id)
  })
  
  // Process nodes level by level
  while (queue.length > 0) {
    const { nodeId, x, y, isOnMainPath } = queue.shift()!
    const children = childrenMap.get(nodeId)
    
    if (!children || children.size === 0) continue
    
    // Check if this is a branch point
    if (isBranchPoint(nodeId)) {
      // Branch point: position children horizontally
      const childrenArray = Array.from(children)
      const nextY = y + VERTICAL_GAP
      
      let mainPathChild: string | null = null
      const branchChildren: string[] = []
      
      // Separate main path from branches
      childrenArray.forEach(childId => {
        if (isBranchEdge(nodeId, childId)) {
          branchChildren.push(childId)
        } else {
          mainPathChild = childId
        }
      })
      
      // Position main path child at BASE_X (continues straight down)
      if (mainPathChild && !processed.has(mainPathChild)) {
        positions.set(mainPathChild, { x: BASE_X, y: nextY })
        queue.push({ nodeId: mainPathChild, x: BASE_X, y: nextY, isOnMainPath: true })
        processed.add(mainPathChild)
      }
      
      // Position branch children to the right
      branchChildren.forEach((childId, index) => {
        if (!processed.has(childId)) {
          const branchX = BASE_X + ((index + 1) * BRANCH_X_OFFSET)
          positions.set(childId, { x: branchX, y: nextY })
          queue.push({ nodeId: childId, x: branchX, y: nextY, isOnMainPath: false })
          processed.add(childId)
        }
      })
    } else {
      // Linear flow: position children below current node
      const childrenArray = Array.from(children)
      const nextY = y + VERTICAL_GAP
      
      childrenArray.forEach(childId => {
        if (!processed.has(childId)) {
          // Check if this child has multiple parents (convergence point)
          const childParents = parentsMap.get(childId)
          const hasMultipleParents = childParents && childParents.size > 1
          
          if (hasMultipleParents) {
            // Wait until all parents are processed
            const allParentsProcessed = Array.from(childParents).every(parentId => 
              processed.has(parentId)
            )
            
            if (!allParentsProcessed) {
              // Skip for now, will be processed later
              return
            }
            
            // Convergence point: return to BASE_X (main path)
            positions.set(childId, { x: BASE_X, y: nextY })
            queue.push({ nodeId: childId, x: BASE_X, y: nextY, isOnMainPath: true })
            processed.add(childId)
          } else {
            // Regular node: maintain current X position
            positions.set(childId, { x: isOnMainPath ? BASE_X : x, y: nextY })
            queue.push({ nodeId: childId, x: isOnMainPath ? BASE_X : x, y: nextY, isOnMainPath })
            processed.add(childId)
          }
        }
      })
    }
  }
  
  // Handle any orphaned nodes (not connected to flow)
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      // Place orphaned nodes in a separate area
      positions.set(node.id, { 
        x: BASE_X + (BRANCH_X_OFFSET * 2), 
        y: BASE_Y + (positions.size * VERTICAL_GAP) 
      })
    }
  })
  
  // Snap all positions to grid and create final result
  const positionedNodes = nodes.map(node => {
    const pos = positions.get(node.id)!
    return {
      ...node,
      position: {
        x: snapToGrid(pos.x, GRID_SIZE),
        y: snapToGrid(pos.y, GRID_SIZE)
      }
    }
  })
  
  return {
    nodes: positionedNodes
  }
}

/**
 * Snap value to nearest grid multiple
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

