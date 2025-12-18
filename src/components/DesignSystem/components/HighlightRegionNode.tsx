import React from 'react'
import { NodeResizer, Handle, Position } from '@xyflow/react'
import { Edit, MoreVertical, Image as ImageIcon } from 'lucide-react'
import { convertEmojis } from '../../../utils/emojiConverter'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
  isConnecting?: boolean
  connectedEdges?: Array<{ sourceHandle?: string | null; targetHandle?: string | null; source: string; target: string }>
  handleArrowStates?: string[]
  onHandleArrowToggle?: (nodeId: string, handleId: string) => void
}

export function HighlightRegionNode({ id, data, selected, onEdit, isConnecting = false, connectedEdges = [], handleArrowStates = [], onHandleArrowToggle }: HighlightRegionNodeProps) {
  const {
    label = 'Highlight Region',
    backgroundColor = '#ccfbf1', // Turquoise (Teal) by default
    borderColor = '#14b8a6',
    onExportRegion
  } = data || {}

  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonClickTimeRef = useRef<number>(0)
  
  // Track hover state for individual handles
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null)
  
  // Track which handles are arrows (Set of handle IDs)
  const arrowHandles = React.useMemo(() => new Set(handleArrowStates), [handleArrowStates.join(',')])

  // Update menu position when it opens
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          setMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.right + window.scrollX - 160 // 160px is min-w-[160px]
          })
        }
      }
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setMenuPosition(null)
    }
  }, [showMenu])

  // Close menu when clicking outside or when canvas is panned/clicked
  useEffect(() => {
    let isMouseDown = false
    let mouseDownTarget: HTMLElement | null = null

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      mouseDownTarget = target
      isMouseDown = true
      
      // Don't close if clicking on the button or menu
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        buttonRef.current === target ||
        menuRef.current === target
      ) {
        return
      }
      
      // Don't close if button was just clicked (within 100ms)
      const timeSinceButtonClick = Date.now() - buttonClickTimeRef.current
      if (timeSinceButtonClick < 100) {
        return
      }
      
      // Check if click is on ReactFlow pane (canvas background)
      const isReactFlowPane = target.closest('.react-flow__pane') || 
                             target.closest('.react-flow__viewport') ||
                             target.classList.contains('react-flow__pane') ||
                             target.classList.contains('react-flow__viewport')
      
      const menu = document.querySelector('.region-options-menu')
      
      // Close if clicking on ReactFlow pane
      if (isReactFlowPane) {
        setShowMenu(false)
        setIsHovered(false)
        return
      }
      
      // Close if clicking outside the region and menu
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menu &&
        !menu.contains(target) &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setShowMenu(false)
        setIsHovered(false)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      // If mouse is down and moving, it's likely a pan operation
      if (isMouseDown && mouseDownTarget) {
        const target = event.target as HTMLElement
        const isReactFlowPane = mouseDownTarget.closest('.react-flow__pane') || 
                               mouseDownTarget.closest('.react-flow__viewport') ||
                               mouseDownTarget.classList.contains('react-flow__pane') ||
                               mouseDownTarget.classList.contains('react-flow__viewport')
        
        // If panning started from the pane, close the menu
        if (isReactFlowPane && (event.movementX !== 0 || event.movementY !== 0)) {
          setShowMenu(false)
          setIsHovered(false)
        }
      }
    }

    const handleMouseUp = () => {
      isMouseDown = false
      mouseDownTarget = null
    }

    // Listen for ReactFlow pane click and pan events
    const handlePaneClick = () => {
      // Don't close if button was just clicked (within 100ms)
      const timeSinceButtonClick = Date.now() - buttonClickTimeRef.current
      if (timeSinceButtonClick < 100) {
        return
      }
      
      // Don't close if clicking on the button or menu
      const activeElement = document.activeElement as HTMLElement
      if (
        buttonRef.current?.contains(activeElement) ||
        menuRef.current?.contains(activeElement) ||
        buttonRef.current === activeElement ||
        menuRef.current === activeElement
      ) {
        return
      }
      
      setShowMenu(false)
      setIsHovered(false)
    }

    const handlePanStart = () => {
      // Don't close if button was just clicked (within 100ms)
      const timeSinceButtonClick = Date.now() - buttonClickTimeRef.current
      if (timeSinceButtonClick < 100) {
        return
      }
      
      setShowMenu(false)
      setIsHovered(false)
    }

    if (showMenu) {
      // Use a small delay to avoid closing immediately on open
      setTimeout(() => {
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('reactflow-pane-click', handlePaneClick)
        document.addEventListener('reactflow-pan-start', handlePanStart)
      }, 0)
      return () => {
        document.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('reactflow-pane-click', handlePaneClick)
        document.removeEventListener('reactflow-pan-start', handlePanStart)
      }
    }
  }, [showMenu])

  // Keep hover state when menu is open
  useEffect(() => {
    if (showMenu) {
      setIsHovered(true)
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

  // Get all handle positions - regions can connect from any side
  const getAllHandlePositions = () => {
    return [
      { type: 'source' as const, position: Position.Top, id: 'source-top' },
      { type: 'source' as const, position: Position.Right, id: 'source-right' },
      { type: 'source' as const, position: Position.Bottom, id: 'source-bottom' },
      { type: 'source' as const, position: Position.Left, id: 'source-left' },
      { type: 'target' as const, position: Position.Top, id: 'target-top' },
      { type: 'target' as const, position: Position.Right, id: 'target-right' },
      { type: 'target' as const, position: Position.Bottom, id: 'target-bottom' },
      { type: 'target' as const, position: Position.Left, id: 'target-left' },
    ]
  }

  // Extract the side from handle ID (e.g., 'source-top' -> 'top')
  const getHandleSide = (handleId: string): string => {
    return handleId.replace(/^(source|target)-/, '')
  }

  // Check if a handle has an edge connected to it
  const hasEdgeOnHandle = (handleId: string, handleType: 'source' | 'target') => {
    if (handleType === 'source') {
      return connectedEdges.some(edge => {
        if (edge.source !== id) return false
        if (!edge.sourceHandle) return false
        if (edge.sourceHandle === handleId) return true
        const handleSide = getHandleSide(handleId)
        if (edge.sourceHandle === handleSide) return true
        const edgeSide = edge.sourceHandle.replace(/^(source|target)-/, '')
        if (edgeSide === handleSide) return true
        return false
      })
    } else {
      return connectedEdges.some(edge => {
        if (edge.target !== id) return false
        if (!edge.targetHandle) return false
        if (edge.targetHandle === handleId) return true
        const handleSide = getHandleSide(handleId)
        if (edge.targetHandle === handleSide) return true
        const edgeSide = edge.targetHandle.replace(/^(source|target)-/, '')
        if (edgeSide === handleSide) return true
        return false
      })
    }
  }

  // Determine if a handle should be visible
  const shouldShowHandle = (handleId: string, handleType: 'source' | 'target') => {
    if (isConnecting) return true
    if (isHovered) return true
    if (hoveredHandleId !== null) return true // Keep all handles visible when hovering over any handle
    if (hasEdgeOnHandle(handleId, handleType)) return true
    return false
  }

  // Toggle arrow state for a handle
  const toggleHandleArrow = (handleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onHandleArrowToggle) {
      onHandleArrowToggle(id, handleId)
    }
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

      {/* Connection Handles - show on all sides, visible on hover or when connecting */}
      {/* IMPORTANT: All handles must always be rendered so React Flow can register them and calculate edge paths */}
      {getAllHandlePositions().map((handle, index) => {
        const isVisible = shouldShowHandle(handle.id, handle.type)
        const hasEdge = hasEdgeOnHandle(handle.id, handle.type)
        const isConnected = hasEdge
        const isHoveredHandle = hoveredHandleId === handle.id
        const shouldBeArrow = arrowHandles.has(handle.id)
        
        return (
          <React.Fragment key={`${handle.type}-${handle.id}-${index}`}>
            <Handle
              type={handle.type}
              position={handle.position}
              id={handle.id}
              isConnectable={true}
              onMouseEnter={() => setHoveredHandleId(handle.id)}
              onMouseLeave={() => setHoveredHandleId(null)}
              onMouseDown={(e) => {
                if (isConnected) {
                  e.stopPropagation()
                }
              }}
              onClick={(e) => {
                if (isConnected) {
                  toggleHandleArrow(handle.id, e)
                }
              }}
              style={{
                width: '16px',
                height: '16px',
                background: shouldBeArrow ? 'transparent' : (isHoveredHandle && isConnected ? '#3b82f6' : (isVisible ? '#9ca3af' : 'transparent')),
                border: shouldBeArrow ? 'none' : (isVisible ? '2px solid white' : 'none'),
                borderRadius: '50%',
                zIndex: 10,
                opacity: hasEdge ? 1 : (isVisible ? 1 : 0),
                pointerEvents: isVisible || hasEdge ? 'all' : 'none',
                transition: 'background 0.2s ease-in-out, border 0.2s ease-in-out, opacity 0.2s ease-in-out',
                cursor: isConnected ? 'pointer' : (isVisible ? 'crosshair' : 'default'),
              }}
            />
            {/* Arrow shape overlay when handle is arrow */}
            {shouldBeArrow && (
              <div
                style={{
                  position: 'absolute',
                  ...(handle.position === Position.Top && { top: '-8px', left: '50%', transform: 'translateX(-50%) rotate(180deg)' }),
                  ...(handle.position === Position.Right && { right: '-8px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)' }),
                  ...(handle.position === Position.Bottom && { bottom: '-8px', left: '50%', transform: 'translateX(-50%) rotate(0deg)' }),
                  ...(handle.position === Position.Left && { left: '-8px', top: '50%', transform: 'translateY(-50%) rotate(90deg)' }),
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '10px solid',
                  borderBottomColor: isHoveredHandle && isConnected ? '#3b82f6' : (isVisible ? '#9ca3af' : '#9ca3af'),
                  pointerEvents: 'none', // Ensure arrow doesn't block handle clicks
                  zIndex: 10, // Lower than handle's z-index (12) so handles capture events
                  opacity: hasEdge ? 1 : (isVisible ? 1 : 0),
                  transition: 'border-bottom-color 0.2s ease-in-out, opacity 0.2s ease-in-out',
                }}
              />
            )}
          </React.Fragment>
        )
      })}
      
      {/* Main Region Container */}
      <div
        ref={containerRef}
        className={`
          relative w-full h-full
          rounded-lg
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: hexToRgba(backgroundColor, 0.4),
          border: `1px dashed ${borderColor}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          // Only hide if menu is not open
          // Note: hoveredHandleId check in shouldShowHandle keeps handles visible
          if (!showMenu) {
            setIsHovered(false)
          }
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
              color: '#ffffff',
            }}
          >
            {convertEmojis(label)}
          </div>
          
          <div className="flex items-center gap-1 pointer-events-auto">
            {/* More options button - only visible on hover or when menu is open */}
            <div 
              className={`relative transition-opacity duration-200 ${
                isHovered || showMenu ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                if (!showMenu) {
                  setIsHovered(false)
                }
              }}
            >
              <button
                ref={buttonRef}
                onMouseDown={(e) => {
                  // Prevent ReactFlow from handling this click
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  // Record the time of button click to prevent immediate closing
                  buttonClickTimeRef.current = Date.now()
                  setShowMenu(!showMenu)
                }}
                className="p-1.5 bg-white hover:bg-gray-100 rounded shadow-sm transition-colors"
                title="More options"
              >
                <MoreVertical size={14} className="text-gray-700" />
              </button>
              
              {/* More options menu - rendered via portal to appear above all content */}
              {showMenu && menuPosition && createPortal(
                <div
                  ref={menuRef}
                  className="region-options-menu fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px]"
                  style={{
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`
                  }}
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
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setShowMenu(false)
                        onEdit()
                      }}
                      className={`w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors ${
                        onExportRegion ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <Edit size={14} />
                      Edit region
                    </button>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

