import React, { useState } from 'react'
import {
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react'
import { PlusCircle } from 'lucide-react'
import { convertEmojis } from '../../../utils/emojiConverter'

interface CustomEdgeData {
  label?: string
  onLabelClick?: (edgeId: string) => void
  highlighted?: boolean
}

type CustomEdgeProps = EdgeProps & {
  data?: CustomEdgeData
}

export function CustomEdge(props: CustomEdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    data,
    selected,
  } = props
  
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
  const isHighlighted = selected || isHovered || data?.highlighted

  // Debug log
  React.useEffect(() => {
    if (selected || data?.highlighted) {
      console.log('Edge highlighted:', id, 'selected:', selected, 'highlighted:', data?.highlighted)
    }
  }, [selected, data?.highlighted, id])

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.onLabelClick) {
      data.onLabelClick(id)
    }
  }

  return (
    <>
      {/* Interactive invisible path with large hit area */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={150}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          cursor: 'pointer',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          pointerEvents: 'stroke'
        }}
      />
      {/* Visible edge path */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={isHighlighted ? 3 : 2}
        stroke={data?.highlighted ? '#10b981' : (isHighlighted ? '#3b82f6' : '#9ca3af')}
        className={`react-flow__edge-path ${selected ? 'selected' : ''} ${data?.highlighted ? 'highlighted' : ''}`}
        style={{ 
          pointerEvents: 'none',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
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
              className={`px-3 py-1.5 rounded-lg border hover:shadow-md transition-all cursor-pointer whitespace-pre-wrap break-words max-w-xs ${
                data?.highlighted 
                  ? 'bg-green-50 border-green-500 text-green-700' 
                  : 'bg-white border-gray-300 hover:border-blue-500 text-gray-700'
              }`}
            >
              <span className="font-medium">{convertEmojis(data.label)}</span>
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

