import type { Node, Edge } from '@xyflow/react'

export interface RegionBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Check if a node's bounding box intersects with the region bounds
 */
function nodeIntersectsRegion(node: Node, regionBounds: RegionBounds): boolean {
  const nodeWidth = (node.width as number) || (node.style?.width as number) || 200
  const nodeHeight = (node.height as number) || (node.style?.height as number) || 100
  
  const nodeRight = node.position.x + nodeWidth
  const nodeBottom = node.position.y + nodeHeight
  const regionRight = regionBounds.x + regionBounds.width
  const regionBottom = regionBounds.y + regionBounds.height

  return !(
    node.position.x > regionRight ||
    nodeRight < regionBounds.x ||
    node.position.y > regionBottom ||
    nodeBottom < regionBounds.y
  )
}

/**
 * Get all nodes that intersect with the region bounds
 * Excludes the region node itself
 */
export function getNodesInRegion(
  nodes: Node[],
  regionBounds: RegionBounds,
  excludeNodeId?: string
): Node[] {
  return nodes.filter(
    (node) =>
      node.id !== excludeNodeId &&
      node.type !== 'highlightRegion' &&
      nodeIntersectsRegion(node, regionBounds)
  )
}

/**
 * Get all edges whose source and target nodes are both in the provided node IDs set
 */
export function getEdgesForNodes(edges: Edge[], nodeIds: Set<string>): Edge[] {
  return edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
}

/**
 * Shift nodes so that the region's top-left corner becomes (0, 0)
 */
export function shiftNodesToOrigin(
  nodes: Node[],
  regionBounds: RegionBounds
): Node[] {
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - regionBounds.x,
      y: node.position.y - regionBounds.y,
    },
  }))
}

