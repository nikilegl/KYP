import React, { useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react'
import { PlusCircle } from 'lucide-react'

interface CustomEdgeData {
  label?: string
  onLabelClick?: (edgeId: string) => void
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const hasLabel = data?.label && data.label.trim() !== ''
  const isHighlighted = selected || isHovered

  // Debug log
  React.useEffect(() => {
    if (selected) {
      console.log('Edge selected:', id, 'selected:', selected)
    }
  }, [selected, id])

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.onLabelClick) {
      data.onLabelClick(id)
    }
  }

  return (
    <>
      {/* Invisible wider path for easier hover and selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={50}
        className="react-flow__edge-path"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
      />
      {/* Visible edge path */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={isHighlighted ? 3 : 2}
        stroke={isHighlighted ? '#3b82f6' : '#b1b1b7'}
        className={`react-flow__edge-path ${selected ? 'selected' : ''}`}
        style={{ 
          pointerEvents: 'none',
          stroke: isHighlighted ? '#3b82f6' : '#b1b1b7',
          strokeWidth: isHighlighted ? 3 : 2,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {hasLabel ? (
            <div
              onClick={handleLabelClick}
              className="bg-white px-3 py-1.5 rounded-full border border-gray-300 hover:shadow-md transition-all cursor-pointer hover:border-blue-500 flex items-center gap-2 group"
            >
              <span className="text-gray-700 font-medium">{data.label}</span>
              <PlusCircle
                size={16}
                className="text-blue-500"
              />
            </div>
          ) : (
            <button
              onClick={handleLabelClick}
              className="transition-all hover:scale-110 active:scale-95"
              title="Add label"
              style={{ 
                opacity: isHighlighted ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
                pointerEvents: isHighlighted ? 'all' : 'none',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={24} className="text-blue-500" fill="white" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

