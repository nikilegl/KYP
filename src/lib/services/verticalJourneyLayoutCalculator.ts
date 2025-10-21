/**
 * Vertical Journey Layout Calculator
 * Calculates node positions for vertical (top-to-bottom) user journey diagrams
 * Supports linear flows, branching, convergence, and divergent patterns
 * 
 * Features:
 * - Automatic level assignment based on parent-child relationships
 * - Branch detection and layout (multiple children)
 * - Convergent node handling (multiple parents)
 * - Divergent node detection (branches that don't immediately converge)
 * - Edge label-aware spacing
 * - Parent-child X alignment for simple flows
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
 * Calculate vertical layout positions for nodes using sophisticated branching algorithm
 * @param nodes - Array of nodes with content but no positions
 * @param edges - Array of edges defining flow and branches
 * @returns Positioned nodes with proper branching, convergence, and divergence layout
 */
export function calculateVerticalJourneyLayout(
  nodes: NodeData[],
  edges: Edge[]
): LayoutResult {
  // Constants for vertical layout
  const GRID_SIZE = 8
  const VERTICAL_GAP = 36
  const HORIZONTAL_GAP = 48
  const NODE_WIDTH = 320
  const DEFAULT_CENTER_X = 288 // Default center position
  const BRANCH_SPACING = 384 // Spacing between branch children
  const DIVERGENT_OFFSET = 200 // Additional offset for divergent nodes
  
  // Height estimation constants
  const BASE_NODE_HEIGHT = 80 // Base height for label and padding
  const HEIGHT_PER_BULLET = 24 // Additional height per bullet point
  const HEIGHT_PER_NOTIFICATION = 32 // Additional height per notification
  const MIN_NODE_HEIGHT = 100 // Minimum node height
  
  /**
   * Estimate node height based on content
   * Since layout calculation happens before DOM rendering, we can't measure actual heights.
   * Instead, we estimate based on:
   * - Base height (label + padding): 80px
   * - Each bullet point: +24px
   * - Each notification: +32px
   * - Minimum total: 100px
   * 
   * @param node - The node to estimate height for
   * @returns Estimated height in pixels
   */
  const estimateNodeHeight = (node: NodeData): number => {
    let height = BASE_NODE_HEIGHT
    
    // Add height for bullet points
    const bulletPoints = node.bulletPoints || node.data?.bulletPoints || []
    if (Array.isArray(bulletPoints) && bulletPoints.length > 0) {
      height += bulletPoints.length * HEIGHT_PER_BULLET
    }
    
    // Add height for notifications
    const notifications = node.notifications || node.data?.notifications || []
    if (Array.isArray(notifications) && notifications.length > 0) {
      height += notifications.length * HEIGHT_PER_NOTIFICATION
    }
    
    // Ensure minimum height
    const finalHeight = Math.max(height, MIN_NODE_HEIGHT)
    
    // Log height estimation for debugging (only if node has extra content)
    if (bulletPoints.length > 0 || notifications.length > 0) {
      const nodeLabel = node.label || node.data?.label || node.id
      console.log(
        `Node "${nodeLabel}": estimated height ${finalHeight}px ` +
        `(${bulletPoints.length} bullets, ${notifications.length} notifications)`
      )
    }
    
    return finalHeight
  }
  
  // Helper function to check if an edge has a label
  const hasEdgeLabel = (sourceId: string, targetId: string): boolean => {
    const edge = edges.find(e => e.source === sourceId && e.target === targetId)
    if (!edge?.data?.label && !edge?.label) return false
    const label = edge.data?.label || edge.label || ''
    return typeof label === 'string' && label.trim() !== ''
  }
  
  // Build adjacency maps for graph traversal
  const adjacencyMap = new Map<string, string[]>()
  const incomingEdges = new Map<string, number>()
  const parentMap = new Map<string, string[]>()
  
  nodes.forEach(node => {
    adjacencyMap.set(node.id, [])
    incomingEdges.set(node.id, 0)
    parentMap.set(node.id, [])
  })
  
  edges.forEach(edge => {
    const sourceChildren = adjacencyMap.get(edge.source) || []
    adjacencyMap.set(edge.source, [...sourceChildren, edge.target])
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1)
    
    const parents = parentMap.get(edge.target) || []
    parentMap.set(edge.target, [...parents, edge.source])
  })
  
  // Find start nodes (nodes with no incoming edges)
  const startNodes = Array.from(incomingEdges.entries())
    .filter(([_, count]) => count === 0)
    .map(([nodeId]) => nodeId)
  
  if (startNodes.length === 0) {
    console.warn('No start node found in vertical layout')
    return { nodes: nodes.map(node => ({ ...node, position: { x: 100, y: 100 } })) }
  }
  
  // Assign levels using BFS
  const levels = new Map<string, number>()
  const horizontalPositions = new Map<string, number>()
  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; level: number; branch: number }> = []
  
  // Initialize start nodes
  startNodes.forEach((nodeId, index) => {
    queue.push({ nodeId, level: 0, branch: index })
    levels.set(nodeId, 0)
    horizontalPositions.set(nodeId, index)
  })
  
  // BFS to assign levels
  while (queue.length > 0) {
    const { nodeId, level, branch } = queue.shift()!
    
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    
    const children = adjacencyMap.get(nodeId) || []
    
    if (children.length === 1) {
      const childId = children[0]
      if (!visited.has(childId)) {
        const currentLevel = levels.get(childId)
        const newLevel = level + 1
        if (currentLevel === undefined || newLevel > currentLevel) {
          levels.set(childId, newLevel)
        }
        horizontalPositions.set(childId, branch)
        queue.push({ nodeId: childId, level: newLevel, branch })
      }
    } else if (children.length > 1) {
      children.forEach((childId, index) => {
        if (!visited.has(childId)) {
          const childBranch = branch + index
          const currentLevel = levels.get(childId)
          const newLevel = level + 1
          if (currentLevel === undefined || newLevel > currentLevel) {
            levels.set(childId, newLevel)
          }
          horizontalPositions.set(childId, childBranch)
          queue.push({ nodeId: childId, level: newLevel, branch: childBranch })
        }
      })
    }
  }
  
  // Post-process: Ensure convergent nodes are at max(parent levels) + 1
  let levelChanged = true
  let iterations = 0
  const maxIterations = 10
  
  while (levelChanged && iterations < maxIterations) {
    levelChanged = false
    iterations++
    
    nodes.forEach(node => {
      const parents = parentMap.get(node.id) || []
      
      if (parents.length >= 2) {
        const parentLevels = parents.map(parentId => levels.get(parentId) || 0)
        const maxParentLevel = Math.max(...parentLevels)
        const correctLevel = maxParentLevel + 1
        const currentLevel = levels.get(node.id) || 0
        
        if (currentLevel !== correctLevel) {
          levels.set(node.id, correctLevel)
          levelChanged = true
        }
      } else if (parents.length === 1) {
        const parentId = parents[0]
        const parentLevel = levels.get(parentId) || 0
        const correctLevel = parentLevel + 1
        const currentLevel = levels.get(node.id) || 0
        
        if (currentLevel !== correctLevel) {
          levels.set(node.id, correctLevel)
          levelChanged = true
        }
      }
    })
  }
  
  // Classify nodes by their relationship type
  const nodeParentCount = new Map<string, number>()
  const nodeChildCount = new Map<string, number>()
  const nodeLayout = new Map<string, string>()
  
  nodes.forEach(node => {
    const parents = parentMap.get(node.id) || []
    const children = adjacencyMap.get(node.id) || []
    nodeParentCount.set(node.id, parents.length)
    nodeChildCount.set(node.id, children.length)
  })
  
  // Classify each node
  nodes.forEach(node => {
    const parentCount = nodeParentCount.get(node.id) || 0
    const childCount = nodeChildCount.get(node.id) || 0
    
    if (parentCount >= 2) {
      nodeLayout.set(node.id, 'Convergent node')
    } else if (parentCount <= 1 && childCount >= 2) {
      nodeLayout.set(node.id, 'Branch node')
    } else if (parentCount === 1) {
      const parents = parentMap.get(node.id) || []
      const parentId = parents[0]
      const parentChildCount = nodeChildCount.get(parentId) || 0
      
      if (parentChildCount >= 2) {
        const parentChildren = adjacencyMap.get(parentId) || []
        const convergentSiblings = parentChildren.filter(siblingId => {
          const siblingParentCount = nodeParentCount.get(siblingId) || 0
          return siblingParentCount >= 2
        })
        
        if (convergentSiblings.length > 0) {
          nodeLayout.set(node.id, 'Divergent node')
        } else {
          nodeLayout.set(node.id, 'Branch-child node')
        }
      } else {
        nodeLayout.set(node.id, 'Simple node')
      }
    } else {
      nodeLayout.set(node.id, 'Simple node')
    }
  })
  
  // Determine which branch nodes should use branching layout
  const branchesWithLayout = new Map<string, boolean>()
  const branchingXPositions = new Map<string, number>()
  
  nodes.forEach(node => {
    const childCount = nodeChildCount.get(node.id) || 0
    
    if (childCount >= 2) {
      const children = adjacencyMap.get(node.id) || []
      const hasDivergentChild = children.some(childId => 
        nodeLayout.get(childId) === 'Divergent node'
      )
      branchesWithLayout.set(node.id, !hasDivergentChild)
    }
  })
  
  // Helper function to get node X position
  const getNodeXPosition = (nodeId: string): number => {
    if (branchingXPositions.has(nodeId)) {
      return branchingXPositions.get(nodeId)!
    }
    const horizontalPos = horizontalPositions.get(nodeId) ?? 0
    return 100 + (horizontalPos * (NODE_WIDTH + HORIZONTAL_GAP))
  }
  
  // Position convergent nodes
  nodes.forEach(node => {
    const parentCount = nodeParentCount.get(node.id) || 0
    
    if (parentCount >= 2) {
      const parents = parentMap.get(node.id) || []
      
      const divergentParent = parents.find(parentId => 
        nodeLayout.get(parentId) === 'Divergent node'
      )
      
      if (divergentParent) {
        const divergentParents = parentMap.get(divergentParent) || []
        if (divergentParents.length > 0) {
          const branchNodeId = divergentParents[0]
          const branchNodeX = branchingXPositions.has(branchNodeId) 
            ? branchingXPositions.get(branchNodeId)!
            : getNodeXPosition(branchNodeId)
          branchingXPositions.set(node.id, branchNodeX)
        }
      } else {
        const findBranchAncestor = (nodeId: string, visited = new Set<string>()): string | null => {
          if (visited.has(nodeId)) return null
          visited.add(nodeId)
          
          const childCount = nodeChildCount.get(nodeId) || 0
          if (childCount >= 2 && branchesWithLayout.get(nodeId)) {
            return nodeId
          }
          
          const nodeParents = parentMap.get(nodeId) || []
          for (const parentId of nodeParents) {
            const result = findBranchAncestor(parentId, visited)
            if (result) return result
          }
          
          return null
        }
        
        const branchAncestor = findBranchAncestor(parents[0])
        if (branchAncestor && branchingXPositions.has(branchAncestor)) {
          const branchX = branchingXPositions.get(branchAncestor)!
          branchingXPositions.set(node.id, branchX)
        }
      }
    }
  })
  
  // Position branch nodes and their children level by level
  const maxLevelForBranching = Math.max(...Array.from(levels.values()), 0)
  for (let level = 0; level <= maxLevelForBranching; level++) {
    const nodesAtLevel = Array.from(levels.entries())
      .filter(([_, l]) => l === level)
      .map(([nodeId]) => nodeId)
    
    nodesAtLevel.forEach(nodeId => {
      const childCount = nodeChildCount.get(nodeId) || 0
      const parentCount = nodeParentCount.get(nodeId) || 0
      
      if (childCount >= 2 && branchesWithLayout.get(nodeId)) {
        const children = adjacencyMap.get(nodeId) || []
        
        let branchNodeX = branchingXPositions.get(nodeId)
        
        if (!branchNodeX) {
          if (parentCount === 1) {
            const parents = parentMap.get(nodeId) || []
            const parentId = parents[0]
            branchNodeX = branchingXPositions.has(parentId) 
              ? branchingXPositions.get(parentId)!
              : getNodeXPosition(parentId)
          } else if (parentCount === 0) {
            branchNodeX = DEFAULT_CENTER_X
          } else {
            branchNodeX = DEFAULT_CENTER_X
          }
          branchingXPositions.set(nodeId, branchNodeX)
        }
        
        // Position children centered around the branch node
        const numChildren = children.length
        children.forEach((childId, index) => {
          const offsetIndex = index - (numChildren - 1) / 2
          const childX = Math.round((branchNodeX + (offsetIndex * BRANCH_SPACING)) / GRID_SIZE) * GRID_SIZE
          branchingXPositions.set(childId, childX)
        })
      }
    })
  }
  
  // Set default X positions (inherit from parent)
  const maxLevel = Math.max(...Array.from(levels.values()), 0)
  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = Array.from(levels.entries())
      .filter(([_, l]) => l === level)
      .map(([nodeId]) => nodeId)
    
    nodesAtLevel.forEach(nodeId => {
      if (branchingXPositions.has(nodeId)) {
        return
      }
      
      const parents = parentMap.get(nodeId) || []
      
      if (parents.length === 1) {
        const parentId = parents[0]
        const parentX = branchingXPositions.has(parentId) 
          ? branchingXPositions.get(parentId)! 
          : getNodeXPosition(parentId)
        branchingXPositions.set(nodeId, parentX)
      } else if (parents.length === 0) {
        const defaultX = getNodeXPosition(nodeId)
        branchingXPositions.set(nodeId, defaultX)
      }
    })
  }
  
  // Group nodes by level for vertical positioning
  const nodesByLevel = new Map<number, string[]>()
  levels.forEach((level, nodeId) => {
    const nodesAtLevel = nodesByLevel.get(level) || []
    nodesByLevel.set(level, [...nodesAtLevel, nodeId])
  })
  
  // Calculate Y positions for each level using estimated heights
  const yPositionsByNode = new Map<string, number>()
  const maxLevels = Math.max(...Array.from(levels.values()), 0)
  
  // Create a map of node IDs to node objects for quick lookup
  const nodeMap = new Map<string, NodeData>()
  nodes.forEach(node => nodeMap.set(node.id, node))
  
  let cumulativeY = 100
  
  for (let level = 0; level <= maxLevels; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || []
    
    if (nodesAtLevel.length === 0) continue
    
    // Check if previous level has branch nodes
    let branchGapMultiplier = 1
    if (level > 0) {
      const previousLevelNodes = nodesByLevel.get(level - 1) || []
      previousLevelNodes.forEach(parentId => {
        const childCount = nodeChildCount.get(parentId) || 0
        if (childCount >= 2 && branchesWithLayout.get(parentId)) {
          branchGapMultiplier = Math.max(branchGapMultiplier, childCount)
        }
      })
    }
    
    if (branchGapMultiplier > 1) {
      const extraBranchGap = VERTICAL_GAP * (branchGapMultiplier - 1)
      cumulativeY += extraBranchGap
    }
    
    // Position nodes at this level
    nodesAtLevel.forEach(nodeId => {
      const parents = parentMap.get(nodeId) || []
      const hasLabeledIncomingEdge = parents.some(parentId => hasEdgeLabel(parentId, nodeId))
      const extraGap = hasLabeledIncomingEdge ? VERTICAL_GAP : 0
      yPositionsByNode.set(nodeId, cumulativeY + extraGap)
    })
    
    // Calculate the maximum height at this level based on actual node content
    const maxHeightAtLevel = Math.max(
      ...nodesAtLevel.map(nodeId => {
        const node = nodeMap.get(nodeId)
        return node ? estimateNodeHeight(node) : MIN_NODE_HEIGHT
      }),
      MIN_NODE_HEIGHT
    )
    
    // Check if any node has labeled incoming edge
    const anyNodeHasLabeledEdge = nodesAtLevel.some(nodeId => {
      const parents = parentMap.get(nodeId) || []
      return parents.some(parentId => hasEdgeLabel(parentId, nodeId))
    })
    
    const extraGap = anyNodeHasLabeledEdge ? VERTICAL_GAP : 0
    cumulativeY += maxHeightAtLevel + VERTICAL_GAP + extraGap
    
    // Log level spacing info
    if (nodesAtLevel.length > 0) {
      console.log(
        `Level ${level}: ${nodesAtLevel.length} node(s), max height ${maxHeightAtLevel}px, ` +
        `cumulative Y now at ${cumulativeY}px`
      )
    }
  }
  
  console.log(`Vertical layout complete: ${nodes.length} nodes positioned across ${maxLevels + 1} levels`)
  
  // Apply calculated positions to nodes
  const positionedNodes = nodes.map(node => {
    const yPosition = yPositionsByNode.get(node.id) ?? 100
    const layout = nodeLayout.get(node.id) || 'Simple node'
    
    let xPosition: number
    
    if (branchingXPositions.has(node.id)) {
      xPosition = branchingXPositions.get(node.id)!
    } else {
      xPosition = getNodeXPosition(node.id)
    }
    
    // Add offset for divergent nodes
    if (layout === 'Divergent node') {
      xPosition += DIVERGENT_OFFSET
    }
    
    return {
      ...node,
      position: {
        x: snapToGrid(xPosition, GRID_SIZE),
        y: snapToGrid(yPosition, GRID_SIZE)
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

