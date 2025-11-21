import { NodeResizer } from '@xyflow/react'
import { Edit, MoreVertical, Image as ImageIcon } from 'lucide-react'
import { convertEmojis } from '../../../utils/emojiConverter'
import { useState, useRef, useEffect } from 'react'

export interface HighlightRegionNodeData {
  label: string
  backgroundColor?: string
  borderColor?: string
  onExportRegion?: (regionNodeId: string) => void
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
    borderColor = '#fbbf24',
    onExportRegion
  } = data || {}

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as HTMLElement) &&
        !buttonRef.current.contains(event.target as HTMLElement)
      ) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showMenu])

  // Convert hex to rgba with 0.4 opacity for the background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(false)
    onExportRegion?.(id)
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
          
          <div className="flex items-center gap-1 pointer-events-auto">
            {/* More options button - always visible on hover */}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setShowMenu(!showMenu)
                }}
                onMouseEnter={() => setShowMenu(true)}
                className="p-1.5 bg-white hover:bg-gray-100 rounded shadow-sm transition-colors"
                title="More options"
              >
                <MoreVertical size={14} className="text-gray-700" />
              </button>
              
              {/* More options menu */}
              {showMenu && (
                <div
                  ref={menuRef}
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onExportRegion && (
                    <button
                      onClick={handleExportClick}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    >
                      <ImageIcon size={14} />
                      Export to JPG
                    </button>
                  )}
                  {selected && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setShowMenu(false)
                        onEdit()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors border-t border-gray-100"
                    >
                      <Edit size={14} />
                      Edit region
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Edit button - only show when selected and menu is not shown */}
            {selected && onEdit && !showMenu && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
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
      </div>
    </>
  )
}

