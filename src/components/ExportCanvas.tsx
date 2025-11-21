import { useEffect, useRef } from 'react'
import { ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Node, Edge, NodeTypes, EdgeTypes } from '@xyflow/react'
import type { RegionBounds } from '../utils/exportUtils'

interface ExportCanvasProps {
  nodes: Node[]
  edges: Edge[]
  regionBounds: RegionBounds
  nodeTypes: NodeTypes
  edgeTypes: EdgeTypes
  onExported: (blob: Blob) => void
  onDone: () => void
  exportWidth?: number
  scale?: number
}

export function ExportCanvas({
  nodes,
  edges,
  regionBounds,
  nodeTypes,
  edgeTypes,
  onExported,
  onDone,
  exportWidth = 3000,
  scale = 2,
}: ExportCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const exportHeight = (regionBounds.height / regionBounds.width) * exportWidth
    const zoom = exportWidth / regionBounds.width

    // Wait for React Flow to render - increased timeout for better reliability
    const timeoutId = setTimeout(async () => {
      if (!containerRef.current) return

      try {
        // Find the ReactFlow container and viewport
        const reactFlowContainer = containerRef.current.querySelector('.react-flow')
        const reactFlowViewport = containerRef.current.querySelector('.react-flow__viewport')
        
        if (!reactFlowContainer || !reactFlowViewport) {
          console.error('ReactFlow elements not found', { container: !!reactFlowContainer, viewport: !!reactFlowViewport })
          onDone()
          return
        }

        // Wait a bit more for rendering - ReactFlow needs time to render SVG elements
        await new Promise(resolve => setTimeout(resolve, 500))

        // Check if nodes are actually rendered
        const nodeElements = reactFlowContainer.querySelectorAll('.react-flow__node')
        console.log('Export debug:', {
          nodeCount: nodes.length,
          renderedNodes: nodeElements.length,
          containerWidth: reactFlowContainer.clientWidth,
          containerHeight: reactFlowContainer.clientHeight,
        })

        // Dynamic import to avoid Vite optimization issues
        const html2canvas = (await import('html2canvas')).default
        
        // Capture the entire ReactFlow container - use window option to ensure proper rendering
        const canvas = await html2canvas(reactFlowContainer as HTMLElement, {
          scale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: exportWidth,
          height: exportHeight,
          allowTaint: true,
          foreignObjectRendering: true,
          windowWidth: exportWidth,
          windowHeight: exportHeight,
        })

        canvas.toBlob(
          (blob) => {
            if (blob) {
              onExported(blob)
            } else {
              console.error('Failed to create blob from canvas')
            }
            onDone()
          },
          'image/jpeg',
          0.92
        )
      } catch (error) {
        console.error('Error exporting canvas:', error)
        if (containerRef.current) {
          containerRef.current.style.visibility = 'hidden'
          containerRef.current.style.opacity = '0'
        }
        onDone()
      }
    }, 1000) // Increased timeout to ensure ReactFlow is fully rendered

    return () => {
      clearTimeout(timeoutId)
    }
  }, [nodes, edges, regionBounds, exportWidth, scale, onExported, onDone])

  const exportHeight = (regionBounds.height / regionBounds.width) * exportWidth
  const zoom = exportWidth / regionBounds.width

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: -10000,
        left: -10000,
        width: exportWidth,
        height: exportHeight,
        pointerEvents: 'none',
        zIndex: -9999,
        backgroundColor: '#ffffff',
        overflow: 'visible',
      }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          defaultViewport={{
            x: 0,
            y: 0,
            zoom,
          }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
        />
      </div>
    </div>
  )
}

