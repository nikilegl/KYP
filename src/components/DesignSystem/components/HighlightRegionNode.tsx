import { NodeResizer } from '@xyflow/react'
import { Edit } from 'lucide-react'

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
          w-full h-full
          rounded-lg
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: backgroundColor,
          opacity: 0.4,
          border: `2px dashed ${borderColor}`,
        }}
      >
        {/* Label at the top */}
        <div 
          className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2"
          style={{ opacity: 1 }}
        >
          <div
            className="px-3 py-1 rounded text-sm font-semibold shadow-sm"
            style={{
              backgroundColor: borderColor,
              color: '#000',
            }}
          >
            {label}
          </div>
          
          {/* Edit button - only show when selected */}
          {selected && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 bg-white hover:bg-gray-100 rounded shadow-sm transition-colors"
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

