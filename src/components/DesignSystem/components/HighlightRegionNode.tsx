import { NodeResizer } from '@xyflow/react'
import { Edit } from 'lucide-react'
import { convertEmojis } from '../../../utils/emojiConverter'

export interface HighlightRegionNodeData {
  label: string
  backgroundColor?: string
  borderColor?: string
}

interface HighlightRegionNodeProps {
  id: string
  data: HighlightRegionNodeData
  selected?: boolean
  onEdit?: () => void
}

export function HighlightRegionNode({ id, data, selected, onEdit }: HighlightRegionNodeProps) {
  const {
    label = 'Highlight Region',
    backgroundColor = '#fef3c7', // Yellow by default
    borderColor = '#fbbf24'
  } = data || {}

  // Convert hex to rgba with 0.4 opacity for the background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <>
      {/* Node Resizer - allows dragging corners/edges to resize */}
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={150}
        handleClassName="!w-3 !h-3 !border-2"
        lineClassName="!border-2"
      />
      
      {/* Main Region Container */}
      <div
        className={`
          relative w-full h-full
          rounded-lg
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: hexToRgba(backgroundColor, 0.4),
          border: `2px dashed ${borderColor}`,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onEdit?.()
        }}
      >
        {/* Label at the top - with full opacity */}
        <div 
          className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 z-10 pointer-events-none"
        >
          <div
            className="px-3 py-1 rounded text-sm font-semibold shadow-sm pointer-events-auto"
            style={{
              backgroundColor: borderColor,
              color: '#000',
            }}
          >
            {convertEmojis(label)}
          </div>
          
          {/* Edit button - only show when selected */}
          {selected && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onEdit()
              }}
              className="p-1.5 bg-white hover:bg-gray-100 rounded shadow-sm transition-colors pointer-events-auto"
              title="Edit region"
            >
              <Edit size={14} className="text-gray-700" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

