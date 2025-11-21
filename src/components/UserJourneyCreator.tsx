import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ConnectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from './DesignSystem/components/Button'
import { UserJourneyNode } from './DesignSystem/components/UserJourneyNode'
import { HighlightRegionNode } from './DesignSystem/components/HighlightRegionNode'
import { CustomEdge } from './DesignSystem/components/CustomEdge'
import { getNodesInRegion, getEdgesForNodes, shiftNodesToOrigin, type RegionBounds } from '../utils/exportUtils'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { Save, Plus, Download, Upload, ArrowLeft, Edit, FolderOpen, Check, Sparkles, Image as ImageIcon, Share2, Copy as CopyIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { OptionsMenu } from './DesignSystem/components/OptionsMenu'
import { ImportJourneyImageModal } from './ImportJourneyImageModal'
import { ImportJourneyTranscriptModal } from './ImportJourneyTranscriptModal'
import { EditNodeModal, type NodeFormData } from './EditNodeModal'
import { EditJourneyModal } from './EditJourneyModal'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import type { UserRole, Project, LawFirm, ThirdParty, Platform } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { getProjects, createUserJourney, updateUserJourney, getUserJourneyById, getUserJourneyByShortId } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import { assignUserJourneysToFolder, getUserJourneyFolders, type UserJourneyFolder } from '../lib/database/services/userJourneyFolderService'
import { nameToSlug } from '../utils/slugUtils'
import { getThirdParties } from '../lib/database/services/thirdPartyService'
import { getPlatforms } from '../lib/database/services/platformService'
import { createUserRole } from '../lib/database/services/userRoleService'
import type { AnalyzedJourney } from '../lib/services/aiImageAnalysisService'
import { convertTranscriptToJourney, editJourneyWithAI } from '../lib/aiService'
import { generateTranscriptToJourneyPrompt } from '../lib/prompts/transcript-to-journey-prompt'
import { calculateVerticalJourneyLayout } from '../lib/services/verticalJourneyLayoutCalculator'
import { calculateHorizontalJourneyLayout } from '../lib/services/horizontalJourneyLayoutCalculator'
import { convertEmojis } from '../utils/emojiConverter'
import { renderMarkdown } from '../utils/markdownRenderer'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { HistorySection, type Comment } from './common/HistorySection'
import { getUserJourneyComments, createUserJourneyComment, updateUserJourneyComment, deleteUserJourneyComment } from '../lib/database/services/userJourneyCommentService'
import { getWorkspaceUsers } from '../lib/database'
import { useAuth } from '../hooks/useAuth'
import type { WorkspaceUser } from '../lib/supabase'

// We need to define nodeTypes inside the component to access the handlers
// This will be moved inside the component


// Initial nodes for the flow (empty by default)
const initialNodes: Node[] = []

// Initial edges for the flow (empty by default)
const initialEdges: Edge[] = []

interface UserJourneyCreatorProps {
  userRoles?: UserRole[]
  projectId?: string // Optional - if provided, will auto-select that project
  journeyId?: string // Optional - if provided, will load that journey for editing
  thirdParties?: ThirdParty[]
  platforms?: Platform[]
}

// Keyboard zoom handler component
function KeyboardZoomHandler() {
  const { zoomIn, zoomOut } = useReactFlow()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = event.metaKey || event.ctrlKey

      if (isModifierPressed) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          zoomIn({ duration: 200 })
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault()
          zoomOut({ duration: 200 })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut])

  return null
}

export function UserJourneyCreator({ userRoles = [], projectId, journeyId, thirdParties: initialThirdParties, platforms: initialPlatforms }: UserJourneyCreatorProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstanceRef = useRef<any>(null)
  
  // Track Alt key state and original node position for duplicate on drag
  const isAltPressedRef = useRef(false)
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const duplicateNodeIdRef = useRef<string | null>(null) // Track the duplicate node ID during drag
  
  // Track Space key state for panning mode
  const isSpacePressedRef = useRef(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  
  // Track Shift key state for axis-constrained dragging
  const isShiftPressedRef = useRef(false)
  const dragInitialDirectionRef = useRef<Map<string, 'x' | 'y' | null>>(new Map()) // Track initial drag direction for each node
  const resizeStartDimensionsRef = useRef<Map<string, { width: number; height: number }>>(new Map()) // Track initial dimensions when resizing starts
  const resizeInitialDirectionRef = useRef<Map<string, 'width' | 'height' | null>>(new Map()) // Track initial resize direction for each region
  
  // Custom onNodesChange that intercepts Alt+drag to keep original node locked and Shift+resize to constrain axis
  const onNodesChange = useCallback((changes: any[]) => {
    // Process changes for resize constraints (Shift+resize for regions)
    const modifiedChanges: any[] = []
    let duplicatePositionUpdate: { x: number; y: number } | null = null
    
    for (const change of changes) {
      // Check if this is a dimension change (resize) for a region with Shift pressed
      if (change.type === 'dimensions' && isShiftPressedRef.current) {
        const node = nodes.find(n => n.id === change.id)
        if (node && node.type === 'highlightRegion' && change.dimensions) {
          // Get or initialize start dimensions
          let startDimensions = resizeStartDimensionsRef.current.get(change.id)
          if (!startDimensions) {
            // First resize change - capture initial dimensions from the node BEFORE resize
            // Always use node's current dimensions, not the change dimensions
            const currentWidth = (node.style?.width as number) || (node.width as number) || 600
            const currentHeight = (node.style?.height as number) || (node.height as number) || 400
            startDimensions = { width: currentWidth, height: currentHeight }
            resizeStartDimensionsRef.current.set(change.id, startDimensions)
          }
          
          // Get the new dimensions from the change (use current node dimensions as fallback)
          const currentWidth = (node.style?.width as number) || (node.width as number) || startDimensions.width
          const currentHeight = (node.style?.height as number) || (node.height as number) || startDimensions.height
          const newWidth = change.dimensions.width ?? currentWidth
          const newHeight = change.dimensions.height ?? currentHeight
          
          // Calculate deltas from start dimensions (matching drag constraint logic)
          const deltaWidth = Math.abs(newWidth - startDimensions.width)
          const deltaHeight = Math.abs(newHeight - startDimensions.height)
          
          // Determine initial resize direction if not already set (same logic as drag)
          let resizeDirection = resizeInitialDirectionRef.current.get(change.id)
          if (!resizeDirection && (deltaWidth > 5 || deltaHeight > 5)) {
            // Set direction based on which dimension has more change (with threshold)
            // Simple comparison - same as drag constraint
            resizeDirection = deltaWidth > deltaHeight ? 'width' : 'height'
            resizeInitialDirectionRef.current.set(change.id, resizeDirection)
          }
          
          // Constrain resize to the determined dimension (same pattern as drag constraint)
          if (resizeDirection) {
            const constrainedDimensions: { width: number; height: number } = {
              width: newWidth,
              height: newHeight
            }
            
            if (resizeDirection === 'width') {
              // Constrain to width only - allow width to change, keep height at start
              constrainedDimensions.height = startDimensions.height
            } else {
              // Constrain to height only - allow height to change, keep width at start
              constrainedDimensions.width = startDimensions.width
            }
            
            modifiedChanges.push({
              ...change,
              dimensions: constrainedDimensions
            })
            continue
          }
        }
      }
      
      // If Alt+drag is active, intercept position changes
      if (duplicateNodeIdRef.current) {
        const originalNodeId = Array.from(dragStartPositionsRef.current.keys()).find(
          id => id !== duplicateNodeIdRef.current
        )
        
        // If this is a position change for the original node, redirect it to duplicate
        if (change.type === 'position' && change.dragging && change.id === originalNodeId) {
          const originalPosition = dragStartPositionsRef.current.get(change.id)
          if (originalPosition) {
            // Store the position to apply to duplicate instead
            duplicatePositionUpdate = change.position
            // Add a change to reset original node position
            modifiedChanges.push({
              ...change,
              position: originalPosition
            })
            continue
          }
        }
      }
      
      // Allow other changes through
      modifiedChanges.push(change)
    }
    
    // Apply changes
    if (modifiedChanges.length > 0) {
      onNodesChangeBase(modifiedChanges)
    }
    
    // Update duplicate position if needed
    if (duplicatePositionUpdate && duplicateNodeIdRef.current) {
      setNodes((nds) => {
        return nds.map(n => {
          if (n.id === duplicateNodeIdRef.current) {
            // Maintain high z-index when updating position
            return { ...n, position: duplicatePositionUpdate!, zIndex: 1000 }
          }
          return n
        })
      })
    }
  }, [onNodesChangeBase, setNodes, nodes])
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(initialThirdParties || [])
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms || [])
  const [journeyName, setJourneyName] = useState('User Journey 01')
  const [journeyDescription, setJourneyDescription] = useState('')
  const [journeyLayout, setJourneyLayout] = useState<'vertical' | 'horizontal'>('vertical')
  const [journeyStatus, setJourneyStatus] = useState<'personal' | 'shared'>('personal')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showNameEditModal, setShowNameEditModal] = useState(false)
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configuringNode, setConfiguringNode] = useState<Node | null>(null)
  const [isAddingNewNode, setIsAddingNewNode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)
  const [showEdgeLabelModal, setShowEdgeLabelModal] = useState(false)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [journeyFolder, setJourneyFolder] = useState<UserJourneyFolder | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [currentJourneyId, setCurrentJourneyId] = useState<string | null>(journeyId || null)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showImportImageModal, setShowImportImageModal] = useState(false)
  const [showImportJsonModal, setShowImportJsonModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importJsonError, setImportJsonError] = useState<string | null>(null)
  const [showImportTranscriptModal, setShowImportTranscriptModal] = useState(false)
  const [showImportDropdown, setShowImportDropdown] = useState(false)
  const importDropdownRef = useRef<HTMLDivElement>(null)
  const [importTranscriptText, setImportTranscriptText] = useState('')
  const [importTranscriptError, setImportTranscriptError] = useState<string | null>(null)
  const [importTranscriptLoading, setImportTranscriptLoading] = useState(false)
  const [importTranscriptProgress, setImportTranscriptProgress] = useState<string>('')
  const [importTranscriptLayout, setImportTranscriptLayout] = useState<'vertical' | 'horizontal'>('vertical')
  const [showEditWithAIModal, setShowEditWithAIModal] = useState(false)
  const [editInstruction, setEditInstruction] = useState('')
  const [editAIError, setEditAIError] = useState<string | null>(null)
  const [editAILoading, setEditAILoading] = useState(false)
  const [editAIProgress, setEditAIProgress] = useState<string>('')
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [selectedLawFirmIds, setSelectedLawFirmIds] = useState<string[]>([])
  const [lawFirmSearchQuery, setLawFirmSearchQuery] = useState('')
  const [showAddLawFirmModal, setShowAddLawFirmModal] = useState(false)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [userRoleEmojiOverrides, setUserRoleEmojiOverrides] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([])
  const [savingComment, setSavingComment] = useState(false)
  const { user } = useAuth()
  
  // Undo state - stores snapshot before Tidy Up or AI Edit
  const [undoSnapshot, setUndoSnapshot] = useState<{
    nodes: Node[]
    edges: Edge[]
    name: string
    description: string
    action: 'tidyUp' | 'aiEdit'
  } | null>(null)
  
  // History for undo functionality (tracks both nodes and edges)
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoing = useRef(false)

  // Track selected nodes for copy/paste and edge highlighting
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([])
  const [copiedEdges, setCopiedEdges] = useState<Edge[]>([])

  // Highlight region state
  const [showRegionConfigModal, setShowRegionConfigModal] = useState(false)
  const [configuringRegion, setConfiguringRegion] = useState<Node | null>(null)
  const [regionConfigForm, setRegionConfigForm] = useState({
    label: '',
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24'
  })


  // Helper function to snap coordinates to multiples of 8
  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / 8) * 8
  }, [])

  // Undo handler for Tidy Up and AI Edit operations
  const handleUndo = useCallback(() => {
    if (!undoSnapshot) {
      console.log('No undo snapshot available')
      return
    }

    console.log(`Undoing ${undoSnapshot.action}...`)
    
    // Restore the snapshot
    setNodes(undoSnapshot.nodes)
    setEdges(undoSnapshot.edges)
    setJourneyName(undoSnapshot.name)
    setJourneyDescription(undoSnapshot.description)
    
    // Clear the snapshot after using it
    setUndoSnapshot(null)
    
    // Show feedback
    const actionName = undoSnapshot.action === 'tidyUp' ? 'Tidy Up' : 'AI Edit'
    console.log(`✓ Undid ${actionName}`)
  }, [undoSnapshot, setNodes, setEdges])

  // Load projects and journey on mount
  useEffect(() => {
    loadData()
  }, [])

  // Auto-open Edit Journey Details modal for new journeys (only once)
  useEffect(() => {
    // Only open modal if:
    // 1. Not loading (data has loaded)
    // 2. No current journey ID (it's a new journey)
    // 3. Modal is not already open
    // 4. We haven't auto-opened it before (prevents reopening after user closes it)
    if (!loading && !currentJourneyId && !showNameEditModal && !hasAutoOpenedModal) {
      setShowNameEditModal(true)
      setHasAutoOpenedModal(true)
    }
  }, [loading, currentJourneyId, showNameEditModal, hasAutoOpenedModal])

  // Update all nodes when layout changes
  const prevLayoutRef = useRef(journeyLayout)
  useEffect(() => {
    console.log('🔄 Layout changed to:', journeyLayout)
    setNodes((nds) => {
      const updated = nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          journeyLayout
        }
      }))
      console.log('✅ Updated nodes with new layout:', updated.map(n => ({ id: n.id, layout: n.data.journeyLayout })))
      return updated
    })
  }, [journeyLayout, setNodes])

  // Update edges when layout changes to map handle IDs
  // Note: Layout-specific handle mapping removed - nodes now support connectors on all sides
  // Handles can be on any side (top, bottom, left, right) regardless of layout

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)
      
      // Load all law firms
      const lawFirmsData = await getLawFirms()
      setLawFirms(lawFirmsData)
      
      // Load all third parties if not provided
      if (!initialThirdParties || initialThirdParties.length === 0) {
        // Get current user's workspace
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: workspaceUser } = await supabase
              .from('workspace_users')
              .select('workspace_id')
              .eq('user_id', user.id)
              .single()
            
            if (workspaceUser) {
              setWorkspaceId(workspaceUser.workspace_id)
              const thirdPartiesData = await getThirdParties(workspaceUser.workspace_id)
              setThirdParties(thirdPartiesData)
            }
          }
        }
      }
      
      // Load all platforms if not provided
      if (!initialPlatforms || initialPlatforms.length === 0) {
        const platformsData = await getPlatforms()
        setPlatforms(platformsData)
      }
      
      // Load workspace users for comments
      const workspaceUsersData = await getWorkspaceUsers()
      setWorkspaceUsers(workspaceUsersData)
      
      // Check if there's an ID in the URL query params or path
      const urlJourneyId = searchParams.get('id')
      const urlProjectId = searchParams.get('projectId')
      const urlFolderId = searchParams.get('folderId')
      const shortIdParam = params.shortId ? parseInt(params.shortId) : null
      
      // Set folder ID from query params if provided
      if (urlFolderId) {
        setSelectedFolderId(urlFolderId)
      }
      
      let journey = null
      
      // If we have a shortId in the path (e.g., /user-journey/123), use that
      if (shortIdParam && location.pathname.startsWith('/user-journey/')) {
        journey = await getUserJourneyByShortId(shortIdParam)
      } 
      // Otherwise check for full ID in query params or props
      else {
        const loadJourneyId = urlJourneyId || journeyId
        if (loadJourneyId) {
          journey = await getUserJourneyById(loadJourneyId)
        }
      }
      
      if (journey) {
        // Load existing journey
        setCurrentJourneyId(journey.id)
        setJourneyName(journey.name)
        setJourneyDescription(journey.description || '')
        setJourneyLayout(journey.layout || 'vertical')
        setJourneyStatus(journey.status || 'personal')
        setSelectedProjectId(journey.project_id || '')
        
        // Load folder if journey belongs to one
        if (journey.folder_id) {
          try {
            const folders = await getUserJourneyFolders()
            const folder = folders.find(f => f.id === journey.folder_id)
            if (folder) {
              setJourneyFolder(folder)
            }
          } catch (error) {
            console.error('Error loading folder:', error)
          }
        }
        
        // Load associated law firms
        const lawFirmIds = await getUserJourneyLawFirms(journey.id)
        setSelectedLawFirmIds(lawFirmIds)
        
        // Load comments if journey exists
        try {
          const commentsData = await getUserJourneyComments(journey.id)
          setComments(commentsData.map(c => ({
            id: c.id,
            user_id: c.user_id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            updated_at: c.updated_at
          })))
        } catch (error) {
          console.error('Error loading comments:', error)
          setComments([])
        }
        
        if (journey.flow_data) {
          // Extract userRoleEmojiOverrides from flow_data if it exists
          const overrides = (journey.flow_data as any).userRoleEmojiOverrides || {}
          setUserRoleEmojiOverrides(overrides)
          
          // Ensure nodes are selectable
          const nodesWithSelection = journey.flow_data.nodes.map(node => ({
            ...node,
            selectable: true
          }))
          setNodes(nodesWithSelection)
          
          // Migrate old edge handle IDs to new format if needed
          // Old format: 'top', 'bottom', 'left', 'right' (simple side names) or null/undefined
          // New format: 'source-top', 'target-top', etc. (with type prefix)
          console.log('🔍 Checking edges for migration:', {
            totalEdges: journey.flow_data.edges.length,
            sampleEdges: journey.flow_data.edges.slice(0, 5).map(e => ({
              id: e.id,
              source: e.source,
              sourceHandle: e.sourceHandle,
              target: e.target,
              targetHandle: e.targetHandle,
              sourceHandleType: typeof e.sourceHandle,
              targetHandleType: typeof e.targetHandle
            }))
          })
          
          // Determine default handle side based on journey layout
          // For vertical layouts: source-bottom, target-top
          // For horizontal layouts: source-right, target-left
          const defaultSourceHandle = journeyLayout === 'horizontal' ? 'source-right' : 'source-bottom'
          const defaultTargetHandle = journeyLayout === 'horizontal' ? 'target-left' : 'target-top'
          
          const migratedEdges = journey.flow_data.edges.map(edge => {
            let newSourceHandle = edge.sourceHandle
            let newTargetHandle = edge.targetHandle
            let needsMigration = false
            
            // Check if sourceHandle needs migration
            if (!newSourceHandle || 
                (typeof newSourceHandle === 'string' &&
                 !newSourceHandle.startsWith('source-') && 
                 !newSourceHandle.startsWith('target-'))) {
              if (newSourceHandle && typeof newSourceHandle === 'string') {
                // Old format: 'top', 'bottom', etc. - migrate to new format
                const validSides = ['top', 'bottom', 'left', 'right']
                if (validSides.includes(newSourceHandle)) {
                  newSourceHandle = `source-${newSourceHandle}`
                  needsMigration = true
                }
              } else {
                // No handle ID - assign default based on layout
                newSourceHandle = defaultSourceHandle
                needsMigration = true
              }
            }
            
            // Check if targetHandle needs migration
            if (!newTargetHandle || 
                (typeof newTargetHandle === 'string' &&
                 !newTargetHandle.startsWith('source-') && 
                 !newTargetHandle.startsWith('target-'))) {
              if (newTargetHandle && typeof newTargetHandle === 'string') {
                // Old format: 'top', 'bottom', etc. - migrate to new format
                const validSides = ['top', 'bottom', 'left', 'right']
                if (validSides.includes(newTargetHandle)) {
                  newTargetHandle = `target-${newTargetHandle}`
                  needsMigration = true
                }
              } else {
                // No handle ID - assign default based on layout
                newTargetHandle = defaultTargetHandle
                needsMigration = true
              }
            }
            
            // Always return migrated edge if migration was needed
            if (needsMigration) {
              console.log('🔄 Migrating edge handles:', {
                edgeId: edge.id,
                old: { sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle },
                new: { sourceHandle: newSourceHandle, targetHandle: newTargetHandle }
              })
              return {
                ...edge,
                sourceHandle: newSourceHandle,
                targetHandle: newTargetHandle
              }
            }
            
            return edge
          })
          
          const migratedCount = migratedEdges.filter((e, i) => {
            const original = journey.flow_data.edges[i]
            return e.sourceHandle !== original.sourceHandle || e.targetHandle !== original.targetHandle
          }).length
          
          console.log('📊 Edge migration complete:', {
            totalEdges: migratedEdges.length,
            migratedCount,
            sampleEdges: migratedEdges.slice(0, 3).map(e => ({
              id: e.id,
              source: e.source,
              sourceHandle: e.sourceHandle,
              target: e.target,
              targetHandle: e.targetHandle
            }))
          })
          
          setEdges(migratedEdges)
        }
      } else {
        // New journey - set up defaults
        // Check URL params first, then props, otherwise default to No Epic
        const initialProjectId = urlProjectId || projectId
        if (initialProjectId && projectsData.find(p => p.id === initialProjectId)) {
          setSelectedProjectId(initialProjectId)
        }
        // If no URL param or prop, default to empty string (No Epic)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle creating a new law firm from the Edit Journey Details modal
  const handleCreateLawFirmFromModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      // Get current user's workspace
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single()
          
          if (workspaceUser) {
            await createLawFirm(
              newLawFirm.name,
              newLawFirm.structure,
              newLawFirm.status
            )
            
            // Reload law firms
            const lawFirmsData = await getLawFirms({ workspaceId: workspaceUser.workspace_id })
            setLawFirms(lawFirmsData)
            
            // Reset form and close modal
            setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
            setShowAddLawFirmModal(false)
          }
        }
      }
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  // Save state before drag starts (for undo)

  // Undo functionality
  const undo = useCallback(() => {
    console.log('Undo called. Current historyIndex:', historyIndex, 'History length:', history.length)
    if (historyIndex >= 0 && history[historyIndex]) {
      isUndoing.current = true
      const previousState = history[historyIndex]
      console.log('Undoing to index:', historyIndex - 1, 'Restoring state with nodes:', previousState.nodes.length, 'edges:', previousState.edges.length)
      setNodes(JSON.parse(JSON.stringify(previousState.nodes)))
      setEdges(JSON.parse(JSON.stringify(previousState.edges)))
      setHistoryIndex((prev) => prev - 1)
      
      // Reset the flag after state updates
      setTimeout(() => {
        isUndoing.current = false
        console.log('Undo complete. New historyIndex:', historyIndex - 1)
      }, 50)
    } else {
      console.log('Cannot undo: no history available')
    }
  }, [historyIndex, history, setNodes, setEdges])

  // Redo functionality
  const redo = useCallback(() => {
    console.log('Redo called. Current historyIndex:', historyIndex, 'History length:', history.length)
    // Check if there are states ahead to redo
    if (historyIndex < history.length - 1) {
      isUndoing.current = true
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      console.log('Redoing to index:', nextIndex, 'Nodes:', nextState?.nodes?.length, 'Edges:', nextState?.edges?.length)
      
      if (nextState) {
        setNodes(JSON.parse(JSON.stringify(nextState.nodes)))
        setEdges(JSON.parse(JSON.stringify(nextState.edges)))
        setHistoryIndex(nextIndex)
        
        // Reset the flag after state updates
        setTimeout(() => {
          isUndoing.current = false
          console.log('Redo complete. New historyIndex:', nextIndex)
        }, 50)
      }
    } else {
      console.log('Cannot redo: at end of history')
    }
  }, [historyIndex, history, setNodes, setEdges])

  // Unified keyboard shortcut for undo (Cmd+Z / Ctrl+Z) and redo (Cmd+Shift+Z / Ctrl+Shift+Z)
  // Handles both AI/TidyUp undo and node history undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with native undo/redo in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = event.key.toLowerCase()
      const isZ = key === 'z'
      
      if (!isZ) return

      // Check for Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux) - REDO
      if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
        console.log('Redo triggered. historyIndex:', historyIndex, 'history.length:', history.length)
        // Only works with node history (no redo for AI/TidyUp snapshots)
        if (historyIndex < history.length - 1) {
          event.preventDefault()
          console.log('Redoing to state at index:', historyIndex + 2)
          redo()
        } else {
          console.log('Cannot redo: no forward states available')
        }
      }
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) - UNDO
      else if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
        // Try AI/TidyUp undo first (takes priority)
        if (undoSnapshot) {
          event.preventDefault()
          handleUndo()
        }
        // Fall back to node history undo
        else if (historyIndex >= 0 && history[historyIndex]) {
          event.preventDefault()
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undoSnapshot, handleUndo, historyIndex, history, undo, redo])

  // Track selected nodes and update edges highlighting
  useEffect(() => {
    const selected = new Set<string>()
    nodes.forEach(node => {
      if (node.selected) {
        selected.add(node.id)
      }
    })

    // Highlight edges that connect selected nodes
    if (selected.size > 1) {
      setEdges(prevEdges => prevEdges.map(edge => {
        const isConnectingSelectedNodes = selected.has(edge.source) && selected.has(edge.target)
        return {
          ...edge,
          data: {
            ...edge.data,
            highlighted: isConnectingSelectedNodes
          }
        }
      }))
    } else {
      // Clear highlighting when less than 2 nodes selected
      setEdges(prevEdges => prevEdges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          highlighted: false
        }
      })))
    }
  }, [nodes, setEdges])

  // Copy selected nodes to clipboard (Command+C / Ctrl+C) - works across browser tabs
  const copySelectedNodes = useCallback(async () => {
    const selectedNodes = nodes.filter(node => node.selected && node.type !== 'highlightRegion')
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
    // Get edges that connect the selected nodes
    const relevantEdges = edges.filter(edge => 
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )

    // Add type identifier for cross-tab compatibility
    const copyData = {
      type: 'kyp-user-journey-nodes',
      version: '1.0',
      nodes: selectedNodes,
      edges: relevantEdges
    }

    // Store in state for fallback (same-tab fallback)
    setCopiedNodes(selectedNodes)
    setCopiedEdges(relevantEdges)

    // Copy to clipboard as JSON (works across browser tabs)
    try {
      await navigator.clipboard.writeText(JSON.stringify(copyData, null, 2))
      console.log(`Copied ${selectedNodes.length} node(s) and ${relevantEdges.length} edge(s) to clipboard`)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [nodes, edges])

  // Paste nodes from clipboard (Command+V / Ctrl+V)
  const pasteNodes = useCallback(async () => {
    try {
      // First, check if clipboard contains an image
      // If it does, don't handle the paste (let other handlers like ImportJourneyImageModal handle it)
      try {
        const clipboardItems = await navigator.clipboard.read()
        for (const item of clipboardItems) {
          if (item.types.some(type => type.startsWith('image/'))) {
            console.log('Clipboard contains image, skipping node paste')
            return // Let image handlers deal with it
          }
        }
      } catch (clipboardReadError) {
        // If clipboard.read() is not supported or fails, continue with text-based paste
        console.log('Clipboard.read() not available, trying text-based paste')
      }

      // Try to read from clipboard as text
      let copyData: { type?: string; nodes: Node[], edges: Edge[] } | null = null
      
      try {
        const clipboardText = await navigator.clipboard.readText()
        const parsed = JSON.parse(clipboardText)
        
        // Check if it's our format (for cross-tab compatibility)
        if (parsed.type === 'kyp-user-journey-nodes' && Array.isArray(parsed.nodes)) {
          copyData = {
            nodes: parsed.nodes,
            edges: parsed.edges || []
          }
        } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
          // Legacy format (from same tab fallback)
          copyData = parsed
        }
      } catch (clipboardError) {
        // Fallback to state if clipboard read fails
        console.log('Clipboard read failed, using fallback state')
        if (copiedNodes.length > 0) {
          copyData = {
            nodes: copiedNodes,
            edges: copiedEdges
          }
        }
      }

      if (!copyData || !copyData.nodes || copyData.nodes.length === 0) {
        console.log('No nodes to paste')
        return
      }

      // Get the React Flow instance to access viewport utilities
      const reactFlowInstance = reactFlowInstanceRef.current
      if (!reactFlowInstance) {
        console.error('React Flow instance not available')
        return
      }

      // Get viewport center in flow coordinates
      const viewportCenter = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      })

      // Calculate bounding box of nodes being pasted
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      copyData.nodes.forEach(node => {
        const pos = node.position || { x: 0, y: 0 }
        minX = Math.min(minX, pos.x)
        minY = Math.min(minY, pos.y)
        maxX = Math.max(maxX, pos.x)
        maxY = Math.max(maxY, pos.y)
      })

      // Calculate center of the bounding box
      const boundingBoxCenterX = (minX + maxX) / 2
      const boundingBoxCenterY = (minY + maxY) / 2

      // Calculate offset to move bounding box center to viewport center
      const offsetX = viewportCenter.x - boundingBoxCenterX
      const offsetY = viewportCenter.y - boundingBoxCenterY

      // Create ID mapping for nodes
      const idMapping = new Map<string, string>()
      const newNodes: Node[] = copyData.nodes.map(node => {
        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        idMapping.set(node.id, newId)
        
        const originalPos = node.position || { x: 0, y: 0 }
        
        return {
          ...node,
          id: newId,
          position: {
            x: snapToGrid(originalPos.x + offsetX),
            y: snapToGrid(originalPos.y + offsetY)
          },
          selected: true, // Select the pasted nodes
          data: {
            ...node.data
          }
        }
      })

      // Update edge references to use new node IDs
      const newEdges: Edge[] = copyData.edges
        .filter(edge => {
          const newSourceId = idMapping.get(edge.source)
          const newTargetId = idMapping.get(edge.target)
          return newSourceId && newTargetId
        })
        .map(edge => {
          const newSourceId = idMapping.get(edge.source)!
          const newTargetId = idMapping.get(edge.target)!
          
          return {
            ...edge,
            id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: newSourceId,
            target: newTargetId,
            data: {
              ...edge.data
            }
          }
        })

      // Deselect existing nodes
      setNodes(prevNodes => [
        ...prevNodes.map(node => ({ ...node, selected: false })),
        ...newNodes
      ])
      
      // Add new edges
      setEdges(prevEdges => [...prevEdges, ...newEdges])

      console.log(`Pasted ${newNodes.length} node(s) and ${newEdges.length} edge(s)`)
    } catch (error) {
      console.error('Failed to paste nodes:', error)
    }
  }, [copiedNodes, copiedEdges, setNodes, setEdges, snapToGrid])

  // Duplicate selected nodes (for Cmd+D shortcut)
  const duplicateSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected && node.type !== 'highlightRegion')
    if (selectedNodes.length === 0) return

    const timestamp = Date.now()
    const newNodes = selectedNodes.map((node, index) => {
      const newNodeId = `node-${timestamp}-${index}`
      return {
        ...node,
        id: newNodeId,
        type: 'process', // Always set to Middle/process type
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        },
        data: {
          ...node.data,
          type: 'process' // Always set to Middle/process type
        },
        selected: false // Deselect the new nodes
      }
    })

    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), ...newNodes.map(n => ({ ...n, selected: true }))])
  }, [nodes, setNodes])

  // Duplicate selected regions (for Cmd+D shortcut)
  const duplicateSelectedRegions = useCallback(() => {
    const selectedRegions = nodes.filter((node) => node.selected && node.type === 'highlightRegion')
    if (selectedRegions.length === 0) return

    const timestamp = Date.now()
    const regionIdMap = new Map<string, string>() // Map old region ID to new region ID
    
    // First, duplicate the regions themselves
    const newRegions = selectedRegions.map((region, index) => {
      const newRegionId = `region-${timestamp}-${index}`
      regionIdMap.set(region.id, newRegionId)
      
      return {
        ...region,
        id: newRegionId,
        position: {
          x: region.position.x + 50,
          y: region.position.y + 50
        },
        selected: false // Deselect the new region
      }
    })

    // Then, duplicate nodes that belong to these regions (nodes with parentId matching region ID)
    const nodesInRegions = nodes.filter((node) => 
      node.parentId && selectedRegions.some(region => region.id === node.parentId)
    )
    
    const newNodeIdMap = new Map<string, string>() // Map old node ID to new node ID
    const newNodes = nodesInRegions.map((node, index) => {
      const newNodeId = `node-${timestamp}-${index}`
      newNodeIdMap.set(node.id, newNodeId)
      
      // Get the new parent region ID
      const newParentId = regionIdMap.get(node.parentId || '')
      
      return {
        ...node,
        id: newNodeId,
        parentId: newParentId || node.parentId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        },
        selected: false // Deselect the new nodes
      }
    })

    // Update edges that connect nodes within the duplicated regions
    const newEdges = edges
      .filter((edge) => {
        const sourceInRegion = newNodeIdMap.has(edge.source)
        const targetInRegion = newNodeIdMap.has(edge.target)
        return sourceInRegion && targetInRegion
      })
      .map((edge, index) => ({
        ...edge,
        id: `edge-${timestamp}-${index}`,
        source: newNodeIdMap.get(edge.source) || edge.source,
        target: newNodeIdMap.get(edge.target) || edge.target,
        selected: false
      }))

    // Deselect all existing nodes/regions, then add the new ones
    setNodes((nds) => [
      ...nds.map(n => ({ ...n, selected: false })),
      ...newRegions.map(r => ({ ...r, selected: true })),
      ...newNodes
    ])
    
    // Add new edges if any
    if (newEdges.length > 0) {
      setEdges((eds) => [
        ...eds.map(e => ({ ...e, selected: false })),
        ...newEdges
      ])
    }
  }, [nodes, edges, setNodes, setEdges])

  // Keyboard shortcuts for copy/paste/duplicate and comments toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey
      
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check if any nodes or edges are selected
      const hasSelectedNodes = nodes.some(node => node.selected)
      const hasSelectedEdges = edges.some(edge => edge.selected)
      const hasSelection = hasSelectedNodes || hasSelectedEdges

      // Handle 'C' key without modifiers to toggle comments panel
      if ((event.key === 'c' || event.key === 'C') && !isModifierPressed && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        setShowComments(!showComments)
        return
      }

      if (isModifierPressed) {
        if (event.key === 'c' || event.key === 'C') {
          // Only copy if there are selected nodes/edges
          if (hasSelection) {
            event.preventDefault()
            copySelectedNodes()
          }
        } else if (event.key === 'v' || event.key === 'V') {
          // Always allow paste (works across browser tabs)
          // Don't prevent default for paste - let pasteNodes decide if it should handle it
          // This allows image paste handlers (like ImportJourneyImageModal) to work
          pasteNodes()
        } else if (event.key === 'd' || event.key === 'D') {
          // Duplicate selected nodes or regions (Cmd/Ctrl+D)
          const hasSelectedNodesForDuplicate = nodes.some(node => node.selected && node.type !== 'highlightRegion')
          const hasSelectedRegionsForDuplicate = nodes.some(node => node.selected && node.type === 'highlightRegion')
          
          if (hasSelectedRegionsForDuplicate) {
            event.preventDefault()
            duplicateSelectedRegions()
          } else if (hasSelectedNodesForDuplicate) {
            event.preventDefault()
            duplicateSelectedNodes()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [copySelectedNodes, pasteNodes, duplicateSelectedNodes, duplicateSelectedRegions, nodes, edges, showComments])

  // Handle clicking outside the import dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setShowImportDropdown(false)
      }
    }

    if (showImportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showImportDropdown])

  // Track if we're currently dragging a connection
  const [isConnecting, setIsConnecting] = useState(false)

  // Handle connection start (when user starts dragging from a handle)
  const onConnectStart = useCallback((_event: any, params: any) => {
    setIsConnecting(true)
    console.log('🎯 Connection START - User dragging from handle:', {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
      currentLayout: journeyLayout
    })
    
    // Check if the handle exists on the node
    const node = nodes.find(n => n.id === params.nodeId)
    if (node) {
      console.log('  📍 Source node data:', {
        id: node.id,
        type: node.data?.type,
        journeyLayout: node.data?.journeyLayout
      })
    }
  }, [journeyLayout, nodes])

  // Handle connection end (when user releases the drag)
  const onConnectEnd = useCallback((_event: any, params?: any) => {
    setIsConnecting(false)
    console.log('🛑 Connection END - User released drag', params)
    
    // Log current edges to see if edge was created
    setTimeout(() => {
      console.log('📊 Current edges after connection end:', edges.map(e => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle
      })))
    }, 100)
  }, [edges])

  // Monitor cursor state changes by checking document classes
  useEffect(() => {
    if (!isConnecting) return

    const checkCursor = () => {
      const reactFlowElement = document.querySelector('.react-flow')
      if (reactFlowElement) {
        const computedStyle = window.getComputedStyle(reactFlowElement)
        const cursor = computedStyle.cursor
        
        if (cursor === 'crosshair') {
          console.log('➕ CROSSHAIR CURSOR - hovering over valid target')
        } else if (cursor === 'grabbing' || cursor === 'grab') {
          console.log('👆 GRAB CURSOR - dragging')
        } else {
          console.log('🖱️ Cursor:', cursor)
        }
      }
    }

    // Check cursor state periodically while connecting
    const intervalId = setInterval(checkCursor, 100)
    
    return () => clearInterval(intervalId)
  }, [isConnecting])

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('✅ Connection SUCCESS:', {
        source: params.source,
        sourceHandle: params.sourceHandle,
        target: params.target,
        targetHandle: params.targetHandle
      })
      
      // Fix handle IDs if React Flow picked the wrong handle type
      // React Flow might pick target handles when dragging from source handles
      // because we have both source and target handles at the same position
      let fixedSourceHandle = params.sourceHandle
      let fixedTargetHandle = params.targetHandle
      
      // If sourceHandle starts with 'target-', convert it to 'source-'
      if (fixedSourceHandle && fixedSourceHandle.startsWith('target-')) {
        fixedSourceHandle = fixedSourceHandle.replace(/^target-/, 'source-')
        console.log('🔧 Fixed sourceHandle:', params.sourceHandle, '->', fixedSourceHandle)
      }
      
      // If targetHandle starts with 'source-', convert it to 'target-'
      if (fixedTargetHandle && fixedTargetHandle.startsWith('source-')) {
        fixedTargetHandle = fixedTargetHandle.replace(/^source-/, 'target-')
        console.log('🔧 Fixed targetHandle:', params.targetHandle, '->', fixedTargetHandle)
      }
      
      const edgeParams = {
        ...params,
        sourceHandle: fixedSourceHandle,
        targetHandle: fixedTargetHandle,
        data: {}
      }
      
      console.log('📝 Creating edge with handle IDs:', {
        sourceHandle: edgeParams.sourceHandle,
        targetHandle: edgeParams.targetHandle
      })
      
      setEdges((eds) => {
        const newEdges = addEdge(edgeParams, eds)
        console.log('🔗 Edge added. Total edges:', newEdges.length)
        console.log('🔗 New edge:', newEdges[newEdges.length - 1])
        return newEdges
      })
    },
    [setEdges]
  )

  // Validate connections (optional - can be enhanced with more logic)
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    console.log('🔍 Validating connection:', {
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle
    })
    
    // Check if source and target nodes exist
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    if (!sourceNode || !targetNode) {
      console.log('  ❌ Validation FAILED: Node not found', {
        sourceFound: !!sourceNode,
        targetFound: !!targetNode
      })
      return false
    }
    
    // Don't allow connections to label nodes
    if (sourceNode.data?.type === 'label' || targetNode.data?.type === 'label') {
      console.log('  ❌ Validation FAILED: Cannot connect to/from label nodes')
      return false
    }
    
    console.log('  ℹ️ Node info:', {
      source: { id: sourceNode.id, type: sourceNode.data?.type, layout: sourceNode.data?.journeyLayout },
      target: { id: targetNode.id, type: targetNode.data?.type, layout: targetNode.data?.journeyLayout }
    })
    
    // Basic validation - can't connect to self
    const isValid = connection.source !== connection.target
    console.log(`  ${isValid ? '✅' : '❌'} Validation result: ${isValid}`)
    
    // Always return true for valid node-to-node connections (all sides are allowed now)
    return isValid
  }, [nodes])

  // Smart add node - opens modal to configure node before adding
  const smartAddNode = useCallback(() => {
    setIsAddingNewNode(true)
    setConfiguringNode(null)
    setShowConfigModal(true)
  }, [])

  // Keyboard shortcut for adding a node ('+' key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if '+' or '=' key is pressed ('+' is usually Shift + '=')
      // Allow either the plus character or the equals key
      const isPlusKey = event.key === '+' || (event.key === '=' && event.shiftKey)
      
      if (isPlusKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Don't trigger if user is typing in an input field
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        
        event.preventDefault()
        smartAddNode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [smartAddNode])

  // Track unsaved changes when nodes or edges are modified
  useEffect(() => {
    // Don't mark as unsaved if we're just loading the journey
    if (currentJourneyId && nodes.length > 0) {
      setHasUnsavedChanges(true)
    }
  }, [nodes, edges, currentJourneyId])

  // Sort nodes to ensure parents come before children (required by React Flow)
  const sortNodesForSaving = useCallback((nodesToSort: Node[]): Node[] => {
    const sorted: Node[] = []
    const processed = new Set<string>()

    const addNodeAndParents = (node: Node) => {
      // If already processed, skip
      if (processed.has(node.id)) return

      // If node has a parent, process parent first
      if (node.parentId) {
        const parent = nodesToSort.find(n => n.id === node.parentId)
        if (parent && !processed.has(parent.id)) {
          addNodeAndParents(parent)
        }
      }

      // Add this node
      sorted.push(node)
      processed.add(node.id)
    }

    // Process all nodes
    nodesToSort.forEach(node => addNodeAndParents(node))

    return sorted
  }, [])

  // Save journey
  const saveJourney = useCallback(async () => {
    if (!journeyName.trim()) {
      return
    }

    // If using default name, open modal to get custom name
    if (journeyName === 'User Journey 01' && !currentJourneyId) {
      setShowNameEditModal(true)
      return
    }

    setSaving(true)
    setJustSaved(false)
    try {
      // Sort nodes to ensure parents come before children
      const sortedNodes = sortNodesForSaving(nodes)
      const flowData = { 
        nodes: sortedNodes, 
        edges,
        userRoleEmojiOverrides 
      }
      
      if (currentJourneyId) {
        // Update existing journey
        const updated = await updateUserJourney(currentJourneyId, {
          name: journeyName,
          description: journeyDescription,
          layout: journeyLayout,
          status: journeyStatus,
          flow_data: flowData,
          project_id: selectedProjectId || null
        })
        
        if (updated) {
          // Save law firm associations
          await setUserJourneyLawFirms(currentJourneyId, selectedLawFirmIds)
          
          console.log('Journey updated successfully:', updated)
          setJustSaved(true)
          setHasUnsavedChanges(false) // Clear unsaved changes flag
          setTimeout(() => setJustSaved(false), 3000)
        }
      } else {
        // Create new journey (default to draft)
        const created = await createUserJourney(
          journeyName,
          journeyDescription,
          flowData,
          selectedProjectId || null,
          journeyLayout
        )
        
        if (created) {
          // Save law firm associations
          await setUserJourneyLawFirms(created.id, selectedLawFirmIds)
          
          // Assign to folder if folderId was provided
          if (selectedFolderId) {
            await assignUserJourneysToFolder([created.id], selectedFolderId)
          }
          
          console.log('Journey created successfully:', created)
          setCurrentJourneyId(created.id)
          setJustSaved(true)
          setHasUnsavedChanges(false) // Clear unsaved changes flag
          setTimeout(() => setJustSaved(false), 3000)
        }
      }
      
      setShowSaveModal(false)
      setShowNameEditModal(false)
    } catch (error) {
      console.error('Error saving journey:', error)
    } finally {
      setSaving(false)
    }
  }, [journeyName, journeyDescription, nodes, edges, selectedProjectId, currentJourneyId, sortNodesForSaving, journeyLayout, journeyStatus, selectedLawFirmIds])

  // Export journey as JSON
  const exportJourney = useCallback(() => {
    const journeyData = {
      name: journeyName,
      description: journeyDescription,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    }
    const dataStr = JSON.stringify(journeyData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `${journeyName.replace(/\s+/g, '_')}_journey.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [journeyName, journeyDescription, nodes, edges])

  // Import journey from pasted JSON text
  const handleImportFromJson = useCallback(() => {
    try {
      setImportJsonError(null)
      
      // Clean the input text - trim whitespace and try to extract JSON if there's extra text
      let cleanedText = importJsonText.trim()
      
      // Remove BOM (Byte Order Mark) if present
      cleanedText = cleanedText.replace(/^\uFEFF/, '')
      
      // Replace smart quotes with standard quotes
      cleanedText = cleanedText.replace(/[\u201C\u201D]/g, '"') // " and "
      cleanedText = cleanedText.replace(/[\u2018\u2019]/g, "'") // ' and '
      
      // Remove invisible/control characters but keep newlines, tabs, and carriage returns
      cleanedText = cleanedText.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      
      // If the text doesn't start with { or [, try to find the JSON portion
      if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
        const jsonMatch = cleanedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
        if (jsonMatch) {
          cleanedText = jsonMatch[0]
        }
      }
      
      // Debug: Log the first 100 characters to help diagnose issues
      console.log('Attempting to parse JSON. First 100 chars:', cleanedText.substring(0, 100))
      console.log('Character codes of first 10 chars:', cleanedText.substring(0, 10).split('').map(c => c.charCodeAt(0)))
      
      const journeyData = JSON.parse(cleanedText)
      
      if (!journeyData.nodes || !Array.isArray(journeyData.nodes)) {
        setImportJsonError('Invalid JSON format: missing nodes array')
        return
      }
      
      // Validate and sanitize nodes
      const importedNodes = journeyData.nodes.map((node: any) => {
        // Ensure all required properties exist
        if (!node.id) {
          throw new Error('Node is missing required "id" property')
        }
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          throw new Error('Node is missing valid "position" property with x and y coordinates')
        }
        if (!node.data) {
          throw new Error('Node is missing required "data" property')
        }
        
        // Convert userRole string to UserRole object if needed
        let userRoleObj = null
        if (node.data.userRole) {
          if (typeof node.data.userRole === 'string') {
            // Trim and normalize the user role name
            const userRoleName = node.data.userRole.trim()
            
            // Find the UserRole object by name (case-insensitive)
            userRoleObj = userRoles.find(
              role => role.name.toLowerCase().trim() === userRoleName.toLowerCase()
            ) || null
            
            // Debug logging
            if (!userRoleObj) {
              console.warn(`Could not find user role: "${userRoleName}"`)
              console.log('Available user roles:', userRoles.map(r => `"${r.name}"`).join(', '))
              console.log('Checking exact matches:')
              userRoles.forEach(role => {
                const match = role.name.toLowerCase().trim() === userRoleName.toLowerCase()
                console.log(`  "${role.name}" (${role.name.length} chars) vs "${userRoleName}" (${userRoleName.length} chars): ${match}`)
              })
            } else {
              console.log(`Successfully mapped "${userRoleName}" to user role:`, userRoleObj.name)
            }
          } else if (typeof node.data.userRole === 'object' && node.data.userRole.id) {
            // Already a UserRole object
            userRoleObj = node.data.userRole
          }
        }
        
        return {
          id: node.id,
          type: node.type || 'process',
          position: {
            x: node.position.x,
            y: node.position.y
          },
          data: {
            ...node.data,
            userRole: userRoleObj
          },
          selectable: true,
        }
      })
      
      setJourneyName(journeyData.name || 'Imported Journey')
      setJourneyDescription(journeyData.description || '')
      
      setNodes(importedNodes)
      setEdges(journeyData.edges || [])
      
      // Close modal and reset state
      setShowImportJsonModal(false)
      setImportJsonText('')
      setImportJsonError(null)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      if (error instanceof Error) {
        // Show a more helpful error message
        const errorMsg = `JSON Parse Error: ${error.message}\n\nTip: Make sure your JSON uses standard double quotes (") and check for any special characters.`
        setImportJsonError(errorMsg)
      } else {
        setImportJsonError('Invalid JSON format. Please check your input.')
      }
    }
  }, [importJsonText, setNodes, setEdges, userRoles])


  // Handle AI-imported journey from image
  const handleImportFromImage = useCallback((analyzedJourney: AnalyzedJourney) => {
    try {
      // Calculate offset if there are existing nodes
      let xOffset = 0
      const IMPORT_HORIZONTAL_GAP = 500 // Gap between existing and imported content
      
      if (nodes.length > 0) {
        // Find the rightmost position of existing nodes
        const rightmostX = Math.max(...nodes.map(node => {
          const nodeWidth = node.style?.width || node.width || 320
          const width = typeof nodeWidth === 'number' ? nodeWidth : 320
          return node.position.x + width
        }))
        
        xOffset = rightmostX + IMPORT_HORIZONTAL_GAP
        console.log(`Existing content detected. Placing imported journey at x offset: ${xOffset}px`)
      }

      // Set journey metadata (only if no existing content)
      if (nodes.length === 0) {
        if (analyzedJourney.name) {
          setJourneyName(analyzedJourney.name)
        }
        if (analyzedJourney.description) {
          setJourneyDescription(analyzedJourney.description)
        }
        // Set layout if provided
        if (analyzedJourney.layout) {
          setJourneyLayout(analyzedJourney.layout)
        }
      }

      // Generate unique IDs to avoid conflicts with existing nodes
      const timestamp = Date.now()
      const idMapping = new Map<string, string>()
      
      // Map old region IDs to new unique IDs
      ;(analyzedJourney.regions || []).forEach((region, index) => {
        idMapping.set(region.id, `region-${timestamp}-${index}`)
      })
      
      // Map old node IDs to new unique IDs
      analyzedJourney.nodes.forEach((node, index) => {
        idMapping.set(node.id, `node-${timestamp}-${index}`)
      })

      // Convert analyzed regions to React Flow nodes (if any) with offset and new IDs
      const regionNodes: Node[] = (analyzedJourney.regions || []).map((region) => ({
        id: idMapping.get(region.id) || region.id,
        type: region.type,
        position: {
          x: region.position.x + xOffset,
          y: region.position.y
        },
        style: region.style,
        data: region.data,
        draggable: region.draggable,
        selectable: region.selectable
      }))

      // Convert analyzed nodes to React Flow nodes with new IDs
      const flowNodes: Node[] = analyzedJourney.nodes.map((node) => {
        // Find matching user role if specified
        let matchedUserRole: UserRole | null = null
        if (node.data.userRole) {
          matchedUserRole = userRoles.find(role => 
            role.name.toLowerCase().includes(node.data.userRole!.toLowerCase()) ||
            node.data.userRole!.toLowerCase().includes(role.name.toLowerCase())
          ) || null
        }

        // Find matching third party if specified
        let matchedThirdParty: ThirdParty | null = null
        if (node.data.thirdPartyName) {
          matchedThirdParty = thirdParties.find(tp =>
            tp.name.toLowerCase().includes(node.data.thirdPartyName!.toLowerCase()) ||
            node.data.thirdPartyName!.toLowerCase().includes(tp.name.toLowerCase())
          ) || null
        }

        // Determine if node belongs to a region based on laneName
        const laneName = (node.data as any).laneName
        const matchingRegion = regionNodes.find(region => 
          region.data.label === laneName
        )

        const baseNode: any = {
          id: idMapping.get(node.id) || node.id,
          type: node.type,
          position: {
            x: node.position.x + xOffset,
            y: node.position.y
          },
          selectable: true,
          data: {
            label: node.data.label,
            type: node.data.type,
            userRole: matchedUserRole,
            variant: node.data.variant || '',
            thirdParty: matchedThirdParty,
            bulletPoints: node.data.bulletPoints || [],
            notifications: node.data.notifications || [],
            customProperties: node.data.customProperties || {},
            // If importing into existing journey, use current layout; otherwise use AI-detected layout
            journeyLayout: nodes.length > 0 ? journeyLayout : (analyzedJourney.layout || journeyLayout)
          }
        }

        // If node belongs to a region, set parentId for organizational purposes
        // Note: We don't set extent='parent' to allow dragging nodes between regions
        if (matchingRegion) {
          baseNode.parentId = matchingRegion.id
        }

        return baseNode
      })

      // Convert analyzed edges to React Flow edges with updated node references
      const flowEdges: Edge[] = analyzedJourney.edges.map((edge, index) => ({
        id: `edge-${timestamp}-${index}`,
        source: idMapping.get(edge.source) || edge.source,
        target: idMapping.get(edge.target) || edge.target,
        type: edge.type || 'custom',
        data: edge.data || { label: '' }
      }))

      // Combine with existing content (append instead of replace)
      const wasEmpty = nodes.length === 0
      const finalJourneyName = wasEmpty 
        ? (analyzedJourney.name || journeyName)
        : journeyName
      
      setNodes([...nodes, ...regionNodes, ...flowNodes])
      setEdges([...edges, ...flowEdges])

      // Close the modal
      setShowImportImageModal(false)

      // Autosave the journey after import
      // Use setTimeout to ensure state updates are complete before saving
      setTimeout(async () => {
        // If there's an existing journey ID, we can always save
        // If it's a new journey, we need a name
        if (currentJourneyId || finalJourneyName.trim()) {
          try {
            await saveJourney()
          } catch (error) {
            console.error('Error autosaving after image import:', error)
          }
        }
      }, 100)

      // Show success message
      const regionText = regionNodes.length > 0 ? `, ${regionNodes.length} regions` : ''
      const actionText = nodes.length > 0 ? 'Added' : 'Successfully imported'
      alert(`${actionText} journey with ${flowNodes.length} nodes${regionText}, and ${flowEdges.length} connections!`)
    } catch (error) {
      console.error('Error processing imported journey:', error)
      alert('Error processing the imported journey. Please try again.')
    }
  }, [nodes, edges, userRoles, thirdParties, journeyName, currentJourneyId, saveJourney, setNodes, setEdges, journeyLayout])

  // Handle AI import from transcript
  const handleImportFromTranscript = useCallback(async () => {
    try {
      setImportTranscriptError(null)
      setImportTranscriptLoading(true)
      setImportTranscriptProgress('Initializing...')

      // Validate transcript
      if (!importTranscriptText.trim()) {
        setImportTranscriptError('Please paste a transcript to import.')
        setImportTranscriptLoading(false)
        setImportTranscriptProgress('')
        return
      }

      // Calculate offset if there are existing nodes
      let xOffset = 0
      const IMPORT_HORIZONTAL_GAP = 500 // Gap between existing and imported content
      
      if (nodes.length > 0) {
        // Find the rightmost position of existing nodes
        const rightmostX = Math.max(...nodes.map(node => {
          const nodeWidth = node.style?.width || node.width || 320
          const width = typeof nodeWidth === 'number' ? nodeWidth : 320
          return node.position.x + width
        }))
        
        xOffset = rightmostX + IMPORT_HORIZONTAL_GAP
        console.log(`Existing content detected. Placing imported journey at x offset: ${xOffset}px`)
      }

      // Generate prompt with actual user roles from database
      const userRoleNames = userRoles.map(role => role.name)
      const dynamicPrompt = generateTranscriptToJourneyPrompt(userRoleNames)
      
      console.log('Using user roles:', userRoleNames)
      console.log('Selected layout:', importTranscriptLayout)

      // Call OpenAI API to convert transcript to journey JSON (content only, no positions)
      const journeyData = await convertTranscriptToJourney(
        importTranscriptText,
        dynamicPrompt,
        userRoleNames,
        (progress) => setImportTranscriptProgress(progress)
      )

      // Validate the response
      if (!journeyData.nodes || !Array.isArray(journeyData.nodes)) {
        setImportTranscriptError('AI did not return valid journey data. Please try again or adjust your transcript.')
        setImportTranscriptLoading(false)
        setImportTranscriptProgress('')
        return
      }

      // --- STEP 1: Extract raw content from AI (no positions) ---
      const rawNodes = journeyData.nodes.map((node: any) => ({
        id: node.id,
        type: node.type || 'process',
        data: node.data
      }))

      // --- STEP 2: Calculate positions using the appropriate layout calculator ---
      const layoutResult = importTranscriptLayout === 'horizontal'
        ? calculateHorizontalJourneyLayout(rawNodes, journeyData.edges || [])
        : calculateVerticalJourneyLayout(rawNodes, journeyData.edges || [])

      // --- STEP 3: Generate unique IDs to avoid conflicts with existing nodes ---
      const timestamp = Date.now()
      const idMapping = new Map<string, string>()
      
      // Map old node IDs to new unique IDs
      layoutResult.nodes.forEach((node: any, index: number) => {
        idMapping.set(node.id, `node-${timestamp}-${index}`)
      })

      // --- STEP 4: Convert to React Flow nodes with positions, user roles, and new IDs ---
      const importedNodes = layoutResult.nodes.map((node: any) => {
        // Find matching user role
        let userRoleObj = null
        if (node.data?.userRole) {
          const userRoleName = typeof node.data.userRole === 'string' 
            ? node.data.userRole.trim() 
            : node.data.userRole.name

          userRoleObj = userRoles.find(
            role => role.name.toLowerCase().trim() === userRoleName.toLowerCase()
          ) || null

          if (!userRoleObj) {
            console.warn(`Could not find user role: "${userRoleName}"`)
          }
        }

        return {
          id: idMapping.get(node.id) || node.id,
          type: node.type || 'process',
          position: {
            x: node.position.x + xOffset,
            y: node.position.y
          },
          data: {
            ...node.data,
            userRole: userRoleObj,
            // If importing into existing journey, use current layout; otherwise use selected layout
            journeyLayout: nodes.length > 0 ? journeyLayout : importTranscriptLayout
          },
          selectable: true,
        }
      })

      // Convert edges with updated node references
      const importedEdges = (journeyData.edges || []).map((edge: any, index: number) => ({
        id: `edge-${timestamp}-${index}`,
        source: idMapping.get(edge.source) || edge.source,
        target: idMapping.get(edge.target) || edge.target,
        type: edge.type || 'custom',
        data: edge.data || { label: '' }
      }))

      // Set journey metadata and layout (only if no existing content)
      if (nodes.length === 0) {
        setJourneyName(journeyData.name || 'Imported from Transcript')
        setJourneyDescription(journeyData.description || '')
        setJourneyLayout(importTranscriptLayout)
      }
      
      // Combine with existing content (append instead of replace)
      const wasEmpty = nodes.length === 0
      const finalJourneyName = wasEmpty 
        ? (journeyData.name || 'Imported from Transcript')
        : journeyName
      
      setNodes([...nodes, ...importedNodes])
      setEdges([...edges, ...importedEdges])
      
      // Close modal and reset state
      setShowImportTranscriptModal(false)
      setImportTranscriptText('')
      setImportTranscriptError(null)
      setImportTranscriptLoading(false)
      setImportTranscriptProgress('')

      // Autosave the journey after import
      // Use setTimeout to ensure state updates are complete before saving
      setTimeout(async () => {
        // If there's an existing journey ID, we can always save
        // If it's a new journey, we need a name
        if (currentJourneyId || finalJourneyName.trim()) {
          try {
            await saveJourney()
          } catch (error) {
            console.error('Error autosaving after transcript import:', error)
          }
        }
      }, 100)

      // Show success message
      const actionText = nodes.length > 0 ? 'Added' : 'Successfully imported'
      alert(`${actionText} journey from transcript with ${importedNodes.length} nodes in ${importTranscriptLayout} layout!`)
    } catch (error) {
      console.error('Error importing from transcript:', error)
      setImportTranscriptError(
        error instanceof Error 
          ? `Failed to convert transcript: ${error.message}` 
          : 'Failed to convert transcript. Please try again.'
      )
      setImportTranscriptLoading(false)
      setImportTranscriptProgress('')
    }
  }, [nodes, edges, importTranscriptText, importTranscriptLayout, userRoles, journeyName, currentJourneyId, saveJourney, setNodes, setEdges])

  // Handle AI-powered journey editing with natural language
  const handleEditWithAI = useCallback(async () => {
    try {
      setEditAIError(null)
      setEditAILoading(true)

      // Validate instruction
      if (!editInstruction.trim()) {
        setEditAIError('Please enter an instruction.')
        setEditAILoading(false)
        return
      }

      // Save snapshot for undo BEFORE making changes
      setUndoSnapshot({
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        name: journeyName,
        description: journeyDescription,
        action: 'aiEdit'
      })

      // Get selected nodes
      const selectedNodes = nodes.filter(node => node.selected)
      const selectedNodeIds = selectedNodes.map(n => n.id)
      const hasSelection = selectedNodes.length > 0

      console.log('Selected nodes:', selectedNodeIds)

      // Prepare current journey data for AI (send only essential data)
      const currentJourney = {
        name: journeyName,
        description: journeyDescription,
        selectedNodeIds: hasSelection ? selectedNodeIds : null, // Tell AI which nodes are selected
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          selected: node.selected || false, // Include selection state
          data: {
            label: node.data?.label,
            type: node.data?.type,
            userRole: node.data?.userRole ? (node.data.userRole as any).name : null,
            variant: node.data?.variant || '',
            thirdPartyName: node.data?.thirdPartyName || '',
            bulletPoints: node.data?.bulletPoints || [],
            customProperties: node.data?.customProperties || {}
          }
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || '',
          data: { label: edge.data?.label || '' }
        }))
      }

      console.log('Sending journey to AI for editing...')
      console.log('Current nodes:', currentJourney.nodes.length)
      console.log('Instruction:', editInstruction)

      // Call OpenAI API to edit the journey (with progress updates)
      const updatedJourney = await editJourneyWithAI(
        currentJourney, 
        editInstruction,
        (progress) => {
          setEditAIProgress(progress)
        }
      )

      // Convert the AI-updated nodes back to React Flow format
      const updatedNodes = updatedJourney.nodes.map((node: any) => {
        // Find matching user role
        let userRoleObj = null
        if (node.data?.userRole) {
          const userRoleName = typeof node.data.userRole === 'string' 
            ? node.data.userRole.trim() 
            : node.data.userRole.name

          userRoleObj = userRoles.find(
            role => role.name.toLowerCase().trim() === userRoleName.toLowerCase()
          ) || null

          if (!userRoleObj) {
            console.warn(`Could not find user role: "${userRoleName}"`)
          }
        }

        return {
          id: node.id,
          type: node.type || 'process',
          position: {
            x: node.position.x,
            y: node.position.y
          },
          data: {
            ...node.data,
            userRole: userRoleObj
          },
          selectable: true,
        }
      })

      // Update journey metadata if changed
      if (updatedJourney.name && updatedJourney.name !== journeyName) {
        setJourneyName(updatedJourney.name)
      }
      if (updatedJourney.description && updatedJourney.description !== journeyDescription) {
        setJourneyDescription(updatedJourney.description)
      }
      
      // Apply the updated nodes and edges
      setNodes(updatedNodes)
      setEdges(updatedJourney.edges || [])
      
      // Close modal and reset state
      setShowEditWithAIModal(false)
      setEditInstruction('')
      setEditAIError(null)
      setEditAILoading(false)
      setEditAIProgress('')

      // Show success message
      alert(`Successfully applied AI edits! Updated ${updatedNodes.length} nodes.`)
    } catch (error) {
      console.error('Error editing with AI:', error)
      setEditAIError(
        error instanceof Error 
          ? `Failed to apply edits: ${error.message}` 
          : 'Failed to apply edits. Please try again.'
      )
      setEditAILoading(false)
      setEditAIProgress('')
    }
  }, [editInstruction, journeyName, journeyDescription, nodes, edges, userRoles, setNodes, setEdges])

  // Configure specific node (from button click)
  const configureNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setConfiguringNode(node)
      setIsAddingNewNode(false)
      setShowConfigModal(true)
    }
  }, [nodes])

  // Keyboard shortcut for editing selected node (Enter key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on Enter key without modifiers
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Don't trigger if user is typing in an input field
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        
        // Check if exactly one node is selected (don't open if multiple selected)
        const selectedNodes = nodes.filter(node => node.selected && node.type !== 'highlightRegion')
        if (selectedNodes.length === 1) {
          event.preventDefault()
          configureNode(selectedNodes[0].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, configureNode])

  // Update emoji override for a user role and update all nodes
  const handleUpdateEmojiOverride = useCallback((roleId: string, emoji: string) => {
    // Update the overrides state
    const newOverrides = { ...userRoleEmojiOverrides }
    if (emoji) {
      newOverrides[roleId] = emoji
    } else {
      delete newOverrides[roleId]
    }
    setUserRoleEmojiOverrides(newOverrides)
    setHasUnsavedChanges(true)
    
    // Update all nodes with this user role to use the new emoji
    // Note: The actual emoji display will be handled by UserRoleTag using the override
    // We don't need to modify node data, just the override state
  }, [userRoleEmojiOverrides])

  // Save node configuration
  const saveNodeConfiguration = useCallback(async (formData: NodeFormData) => {
    if (isAddingNewNode) {
      // Create a new node with position snapped to grid
      const randomX = Math.random() * 400
      const randomY = Math.random() * 400
      
      const newNode: Node = {
        id: `${Date.now()}`,
        type: formData.type,
        position: { 
          x: snapToGrid(randomX), 
          y: snapToGrid(randomY) 
        },
        selectable: true,
        ...(formData.swimLane ? { parentId: formData.swimLane } : {}),
        data: {
          ...formData,
          journeyLayout
        },
      }
      
      setNodes((nds) => [...nds, newNode])
      
      // Save to database if journey already exists
      if (currentJourneyId) {
        try {
          const updatedNodes = [...nodes, newNode]
          await updateUserJourney(currentJourneyId, {
            flow_data: { 
              nodes: updatedNodes, 
              edges,
              userRoleEmojiOverrides 
            }
          })
        } catch (error) {
          console.error('Error saving new node:', error)
        }
      }
    } else {
      // Update existing node
      if (!configuringNode) return

      // If custom user role name and emoji are set, apply emoji to all nodes with the same custom user role name
      const customUserRoleName = formData.customUserRoleName?.trim()
      const customUserRoleEmoji = (formData.customUserRoleEmoji || '').trim()

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === configuringNode.id) {
            const updatedNode: any = {
              ...node,
              type: formData.type,
              data: {
                ...node.data,
                ...formData,
                journeyLayout
              }
            }
            
            // Handle parentId based on swimLane
            if (formData.swimLane) {
              updatedNode.parentId = formData.swimLane
            } else {
              // Remove parentId if swimLane is null
              delete updatedNode.parentId
            }
            
            return updatedNode
          }
          
          // Apply emoji to all nodes with the same custom user role name
          if (customUserRoleName && node.data?.customUserRoleName === customUserRoleName) {
            return {
              ...node,
              data: {
                ...node.data,
                customUserRoleEmoji: customUserRoleEmoji
              }
            }
          }
          
          return node
        })
      )

      // Save to database if journey already exists
      if (currentJourneyId) {
        try {
          // If custom user role name and emoji are set, apply emoji to all nodes with the same custom user role name
          const customUserRoleName = formData.customUserRoleName?.trim()
          const customUserRoleEmoji = (formData.customUserRoleEmoji || '').trim()
          
          const updatedNodes = nodes.map((node) => {
            if (node.id === configuringNode.id) {
              const updatedNode: any = {
                ...node,
                type: formData.type,
                data: {
                  ...node.data,
                  ...formData,
                  journeyLayout
                }
              }
              
              // Handle parentId based on swimLane
              if (formData.swimLane) {
                updatedNode.parentId = formData.swimLane
              } else {
                // Remove parentId if swimLane is null
                delete updatedNode.parentId
              }
              
              return updatedNode
            }
            
            // Apply emoji to all nodes with the same custom user role name
            if (customUserRoleName && node.data?.customUserRoleName === customUserRoleName) {
              return {
                ...node,
                data: {
                  ...node.data,
                  customUserRoleEmoji: customUserRoleEmoji
                }
              }
            }
            
            return node
          })
          
          await updateUserJourney(currentJourneyId, {
            flow_data: { 
              nodes: updatedNodes, 
              edges,
              userRoleEmojiOverrides 
            }
          })
        } catch (error) {
          console.error('Error saving node configuration:', error)
        }
      }
    }

    setShowConfigModal(false)
    setConfiguringNode(null)
    setIsAddingNewNode(false)
  }, [isAddingNewNode, configuringNode, setNodes, currentJourneyId, nodes, edges, journeyLayout, snapToGrid])


  // Delete confirmation handlers (for Delete Confirmation Modal)
  const confirmDeleteNode = useCallback(() => {
    if (nodeToDelete) {
      setNodes((nds) => nds.filter((node) => node.id !== nodeToDelete))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeToDelete && edge.target !== nodeToDelete))
    }
    setShowDeleteConfirm(false)
    setNodeToDelete(null)
  }, [nodeToDelete, setNodes, setEdges])

  const cancelDeleteNode = useCallback(() => {
    setShowDeleteConfirm(false)
    setNodeToDelete(null)
  }, [])

  // Keyboard shortcut for deleting selected nodes/edges (Delete or Backspace)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check if any nodes or edges are selected
      const hasSelectedNodes = nodes.some(node => node.selected)
      const hasSelectedEdges = edges.some(edge => edge.selected)
      const hasSelection = hasSelectedNodes || hasSelectedEdges
      
      // Handle Backspace key (in addition to Delete which React Flow handles)
      if ((event.key === 'Backspace' || event.key === 'Delete') && hasSelection) {
        event.preventDefault()
        
        // Save history before deleting
        if (!isUndoing.current) {
          const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
          }
          setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1)
            const updated = [...newHistory, snapshot]
            return updated.slice(-50)
          })
          setHistoryIndex((prev) => prev + 1)
        }
        
        // Delete selected nodes and their connected edges
        const selectedNodeIds = nodes.filter(node => node.selected).map(node => node.id)
        
        setNodes((nds) => nds.filter((node) => !node.selected))
        setEdges((eds) => eds.filter((edge) => 
          !edge.selected && !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
        ))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, edges, setNodes, setEdges, historyIndex, setHistory, setHistoryIndex])

  // Keyboard shortcut for moving selected nodes/regions with arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check if any nodes are selected
      const hasSelectedNodes = nodes.some(node => node.selected)
      if (!hasSelectedNodes) {
        return
      }

      // Check for arrow keys
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      if (!isArrowKey) {
        return
      }

      event.preventDefault()

      // Determine movement amount (8px normal, 80px with Shift)
      const moveAmount = event.shiftKey ? 80 : 8

      // Helper function to snap to grid (multiples of 8)
      const snapToGrid = (value: number): number => {
        return Math.round(value / 8) * 8
      }

      // Calculate delta based on arrow key
      let deltaX = 0
      let deltaY = 0

      switch (event.key) {
        case 'ArrowUp':
          deltaY = -moveAmount
          break
        case 'ArrowDown':
          deltaY = moveAmount
          break
        case 'ArrowLeft':
          deltaX = -moveAmount
          break
        case 'ArrowRight':
          deltaX = moveAmount
          break
      }

      // Save history before moving
      if (!isUndoing.current) {
        const snapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges))
        }
        setHistory((prev) => {
          const newHistory = prev.slice(0, historyIndex + 1)
          const updated = [...newHistory, snapshot]
          return updated.slice(-50)
        })
        setHistoryIndex((prev) => prev + 1)
      }

      // Move selected nodes
      setNodes((nds) =>
        nds.map((node) => {
          if (node.selected) {
            const newX = snapToGrid(node.position.x + deltaX)
            const newY = snapToGrid(node.position.y + deltaY)
            return {
              ...node,
              position: {
                x: newX,
                y: newY
              }
            }
          }
          return node
        })
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, edges, setNodes, historyIndex, setHistory, setHistoryIndex])

  // Add new highlight region
  const addHighlightRegion = useCallback(() => {
    // Get the React Flow instance to access viewport utilities
    const reactFlowInstance = reactFlowInstanceRef.current
    if (!reactFlowInstance) {
      console.error('React Flow instance not available')
      return
    }

    // Get viewport center in flow coordinates
    const viewportCenter = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    })

    const regionWidth = 600
    const regionHeight = 400

    // Center the region at the viewport center
    // Position is top-left corner, so subtract half width/height
    const newRegionId = `region-${Date.now()}`
    const newRegion: Node = {
      id: newRegionId,
      type: 'highlightRegion',
      position: { 
        x: snapToGrid(viewportCenter.x - regionWidth / 2), 
        y: snapToGrid(viewportCenter.y - regionHeight / 2) 
      },
      style: {
        width: regionWidth,
        height: regionHeight,
        zIndex: -1, // Render behind regular nodes
      },
      data: {
        label: 'New Region',
        backgroundColor: '#fef3c7',
        borderColor: '#fbbf24',
      },
      draggable: true,
      selectable: true,
    }

    setNodes((nds) => [newRegion, ...nds]) // Add region at the beginning (before other nodes)
  }, [setNodes, snapToGrid])

  // Configure highlight region (for editing)
  const configureRegion = useCallback((regionId: string) => {
    const region = nodes.find(n => n.id === regionId)
    if (region && region.type === 'highlightRegion') {
      setConfiguringRegion(region)
      setRegionConfigForm({
        label: (region.data?.label as string) || 'New Region',
        backgroundColor: (region.data?.backgroundColor as string) || '#fef3c7',
        borderColor: (region.data?.borderColor as string) || '#fbbf24',
      })
      setShowRegionConfigModal(true)
    }
  }, [nodes])

  // Save region configuration
  const saveRegionConfiguration = useCallback(() => {
    if (!configuringRegion) return

    setNodes((nds) =>
      nds.map((node) =>
        node.id === configuringRegion.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...regionConfigForm,
              },
            }
          : node
      )
    )

    setShowRegionConfigModal(false)
    setConfiguringRegion(null)
  }, [configuringRegion, regionConfigForm, setNodes])

  // Handle export region - Create off-screen ReactFlow instance for reliable export
  const handleExportRegion = useCallback(async (regionNodeId: string) => {
    const regionNode = nodes.find((n) => n.id === regionNodeId && n.type === 'highlightRegion')
    if (!regionNode) {
      console.error('Region node not found:', regionNodeId)
      return
    }

    // Get region bounds in flow coordinates
    const regionWidth = (regionNode.width as number) || (regionNode.style?.width as number) || 600
    const regionHeight = (regionNode.height as number) || (regionNode.style?.height as number) || 400
    
    const regionBounds: RegionBounds = {
      x: regionNode.position.x,
      y: regionNode.position.y,
      width: regionWidth,
      height: regionHeight,
    }

    // Add padding
    const padding = 20
    const paddedBounds: RegionBounds = {
      x: regionBounds.x - padding,
      y: regionBounds.y - padding,
      width: regionBounds.width + padding * 2,
      height: regionBounds.height + padding * 2,
    }

    // Get nodes and edges in region
    const nodesInRegion = getNodesInRegion(nodes, paddedBounds, regionNodeId)
    const nodeIds = new Set(nodesInRegion.map((n) => n.id))
    const edgesInRegion = getEdgesForNodes(edges, nodeIds)

    // Shift nodes to origin (0,0) for the export
    const shiftedNodes = shiftNodesToOrigin(nodesInRegion, paddedBounds)

    // Calculate export dimensions (high resolution)
    const exportWidth = Math.round(paddedBounds.width * 3) // 3x resolution
    const exportHeight = Math.round(paddedBounds.height * 3)
    const zoom = exportWidth / paddedBounds.width

    try {
      // Create a temporary container off-screen
      const tempContainer = document.createElement('div')
      tempContainer.id = 'react-flow-export-temp'
      tempContainer.style.position = 'fixed'
      tempContainer.style.top = '-10000px'
      tempContainer.style.left = '-10000px'
      tempContainer.style.width = `${exportWidth}px`
      tempContainer.style.height = `${exportHeight}px`
      tempContainer.style.backgroundColor = '#efefef'
      document.body.appendChild(tempContainer)

      // Create ReactFlow instance in the temp container
      const { createRoot } = await import('react-dom/client')
      const React = await import('react')
      const { ReactFlow, ReactFlowProvider } = await import('@xyflow/react')
      
      const root = createRoot(tempContainer)
      
      // Create nodeTypes and edgeTypes inline for the export
      // Note: showHandles: true to display connectors in the export
      const exportNodeTypes: NodeTypes = {
        start: (props: any) => (
          React.createElement(UserJourneyNode, { 
            ...props, 
            showHandles: true,
            thirdParties: thirdParties,
            platforms: platforms,
            isConnecting: false,
            connectedEdges: edgesInRegion,
            userRoleEmojiOverrides: userRoleEmojiOverrides,
          })
        ),
        process: (props: any) => (
          React.createElement(UserJourneyNode, { 
            ...props, 
            showHandles: true,
            thirdParties: thirdParties,
            platforms: platforms,
            isConnecting: false,
            connectedEdges: edgesInRegion,
            userRoleEmojiOverrides: userRoleEmojiOverrides,
          })
        ),
        decision: (props: any) => (
          React.createElement(UserJourneyNode, { 
            ...props, 
            showHandles: true,
            thirdParties: thirdParties,
            platforms: platforms,
            isConnecting: false,
            connectedEdges: edgesInRegion,
            userRoleEmojiOverrides: userRoleEmojiOverrides,
          })
        ),
        end: (props: any) => (
          React.createElement(UserJourneyNode, { 
            ...props, 
            showHandles: true,
            thirdParties: thirdParties,
            platforms: platforms,
            isConnecting: false,
            connectedEdges: edgesInRegion,
            userRoleEmojiOverrides: userRoleEmojiOverrides,
          })
        ),
        label: (props: any) => (
          React.createElement(UserJourneyNode, { 
            ...props, 
            showHandles: false, // Labels typically don't have handles
            thirdParties: thirdParties,
            platforms: platforms,
            isConnecting: false,
            connectedEdges: edgesInRegion,
            userRoleEmojiOverrides: userRoleEmojiOverrides,
          })
        ),
      }
      
      const exportEdgeTypes: EdgeTypes = {
        default: (props: any) => React.createElement(CustomEdge, props),
      }
      
      // Render ReactFlow off-screen
      root.render(
        React.createElement(ReactFlowProvider, {},
          React.createElement(ReactFlow, {
            nodes: shiftedNodes,
            edges: edgesInRegion,
            nodeTypes: exportNodeTypes,
            edgeTypes: exportEdgeTypes,
            fitView: false,
            defaultViewport: {
              x: 0,
              y: 0,
              zoom,
            },
            proOptions: { hideAttribution: true },
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: false,
            panOnDrag: false,
            zoomOnScroll: false,
            zoomOnPinch: false,
            zoomOnDoubleClick: false,
            style: { width: '100%', height: '100%' },
          })
        )
      )

      // Wait for ReactFlow to render
      await new Promise(resolve => setTimeout(resolve, 500))

      // Find the ReactFlow viewport in the temp container
      const tempReactFlow = tempContainer.querySelector('.react-flow') as HTMLElement
      if (!tempReactFlow) {
        console.error('Temporary ReactFlow not rendered')
        root.unmount()
        document.body.removeChild(tempContainer)
        return
      }

      // Use html-to-image to capture
      const { toJpeg } = await import('html-to-image')
      
      const dataUrl = await toJpeg(tempReactFlow, {
        quality: 0.95,
        pixelRatio: 1, // Already scaled via zoom
        backgroundColor: '#efefef',
        filter: (node) => {
          // Exclude UI elements - handle className safely
          if (!node || typeof node !== 'object') return true
          const element = node as HTMLElement
          const className = typeof element.className === 'string' ? element.className : ''
          return !className.includes('react-flow__controls') &&
                 !className.includes('react-flow__minimap') &&
                 !className.includes('react-flow__attribution') &&
                 !className.includes('react-flow__background')
        },
      })

      // Download
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `region-export-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      root.unmount()
      document.body.removeChild(tempContainer)
    } catch (error) {
      console.error('Error exporting region:', error)
      alert('Failed to export region.')
      
      // Cleanup on error
      const tempContainer = document.getElementById('react-flow-export-temp')
      if (tempContainer) {
        document.body.removeChild(tempContainer)
      }
    }
  }, [nodes, edges, thirdParties, platforms, userRoleEmojiOverrides])


  // Monitor Alt key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) {
        isAltPressedRef.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || !e.altKey) {
        isAltPressedRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Monitor Space key state for panning mode
  useEffect(() => {
    const handleSpaceKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        isSpacePressedRef.current = true
        setIsSpacePressed(true)
      }
    }
    
    const handleSpaceKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        isSpacePressedRef.current = false
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleSpaceKeyDown)
    window.addEventListener('keyup', handleSpaceKeyUp)

    return () => {
      window.removeEventListener('keydown', handleSpaceKeyDown)
      window.removeEventListener('keyup', handleSpaceKeyUp)
    }
  }, [])

  // Monitor Shift key state for axis-constrained dragging
  useEffect(() => {
    const handleShiftKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      if (e.key === 'Shift' || e.shiftKey) {
        const wasPressed = isShiftPressedRef.current
        isShiftPressedRef.current = true
        
        // If Shift was just pressed (not already pressed), reset resize tracking
        // This allows users to press Shift mid-resize to start constraining
        if (!wasPressed) {
          resizeStartDimensionsRef.current.clear()
          resizeInitialDirectionRef.current.clear()
        }
      }
    }
    
    const handleShiftKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || !e.shiftKey) {
        isShiftPressedRef.current = false
        // Clear resize tracking when Shift is released
        resizeStartDimensionsRef.current.clear()
        resizeInitialDirectionRef.current.clear()
      }
    }

    window.addEventListener('keydown', handleShiftKeyDown)
    window.addEventListener('keyup', handleShiftKeyUp)

    return () => {
      window.removeEventListener('keydown', handleShiftKeyDown)
      window.removeEventListener('keyup', handleShiftKeyUp)
    }
  }, [])

  // Update region nodes' draggable property based on space bar state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'highlightRegion') {
          return {
            ...node,
            draggable: !isSpacePressed
          }
        }
        return node
      })
    )
  }, [isSpacePressed, setNodes])

  const onNodeDragStart = useCallback((_event: any, node: Node) => {
    // Store original position when drag starts
    dragStartPositionsRef.current.set(node.id, { ...node.position })
    
    // Reset initial drag direction for this node (will be determined on first movement)
    dragInitialDirectionRef.current.set(node.id, null)
    
    // For regions, store initial dimensions when drag starts (for resize constraint)
    if (node.type === 'highlightRegion') {
      const width = (node.style?.width as number) || (node.width as number) || 600
      const height = (node.style?.height as number) || (node.height as number) || 400
      resizeStartDimensionsRef.current.set(node.id, { width, height })
      resizeInitialDirectionRef.current.set(node.id, null)
    }
    
    // If Alt is pressed, create duplicate immediately
    if (isAltPressedRef.current && node.type !== 'highlightRegion') {
      const originalPosition = dragStartPositionsRef.current.get(node.id)
      if (originalPosition) {
        const timestamp = Date.now()
        const newNodeId = `node-${timestamp}`
        duplicateNodeIdRef.current = newNodeId
        
        // Create duplicate at original position (will follow mouse during drag)
        const duplicateNode: Node = {
          ...node,
          id: newNodeId,
          type: 'process',
          position: { ...node.position },
          data: {
            ...node.data,
            type: 'process'
          },
          selected: false,
          draggable: true,
          zIndex: 1000 // High z-index to ensure it appears on top
        }
        
        // Add duplicate and keep original node visible (position will be locked via onNodesChange)
        // Add duplicate at the end so it renders on top
        setNodes((nds) => {
          const updatedNodes = nds.map(n => {
            if (n.id === node.id) {
              // Keep original node visible and at original position
              // Position will be locked via onNodesChange interceptor
              // Lower z-index to ensure it stays below duplicate
              return { ...n, position: originalPosition, zIndex: 0 }
            }
            return n
          })
          // Add duplicate at the end so it renders last (on top)
          return [...updatedNodes, duplicateNode]
        })
      }
    }
    
    if (!isUndoing.current) {
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      }
      setHistory((prev) => {
        // Clear any "future" states if we're not at the end
        const newHistory = prev.slice(0, historyIndex + 1)
        // Add new snapshot
        const updated = [...newHistory, snapshot]
        // Limit history to last 50 states
        return updated.slice(-50)
      })
      setHistoryIndex((prev) => prev + 1)
    }
  }, [nodes, edges, historyIndex, setNodes])

  // Handle node drag - keep original node locked if Alt was pressed, constrain to axis if Shift is pressed
  const onNodeDrag = useCallback((_event: any, node: Node) => {
    // If this is a duplicate operation, keep original node locked
    if (duplicateNodeIdRef.current && node.id !== duplicateNodeIdRef.current) {
      const originalPosition = dragStartPositionsRef.current.get(node.id)
      if (originalPosition) {
        // Reset original node position to keep it locked
        setNodes((nds) => {
          return nds.map(n => {
            if (n.id === node.id && n.id !== duplicateNodeIdRef.current) {
              return { ...n, position: originalPosition }
            }
            return n
          })
        })
      }
    }
    
    // If Shift is pressed, constrain movement to one axis
    if (isShiftPressedRef.current) {
      const startPosition = dragStartPositionsRef.current.get(node.id)
      if (startPosition) {
        const deltaX = Math.abs(node.position.x - startPosition.x)
        const deltaY = Math.abs(node.position.y - startPosition.y)
        
        // Determine initial drag direction if not already set
        let dragDirection = dragInitialDirectionRef.current.get(node.id)
        if (!dragDirection && (deltaX > 5 || deltaY > 5)) {
          // Set direction based on which axis has more movement (with threshold)
          dragDirection = deltaX > deltaY ? 'x' : 'y'
          dragInitialDirectionRef.current.set(node.id, dragDirection)
        }
        
        // Constrain movement to the determined axis
        if (dragDirection) {
          setNodes((nds) => {
            return nds.map(n => {
              if (n.id === node.id) {
                if (dragDirection === 'x') {
                  // Constrain to X axis (horizontal)
                  return { ...n, position: { x: node.position.x, y: startPosition.y } }
                } else {
                  // Constrain to Y axis (vertical)
                  return { ...n, position: { x: startPosition.x, y: node.position.y } }
                }
              }
              return n
            })
          })
        }
      }
    }
  }, [setNodes])

  const handleNodeDragStop = useCallback(
    (_event: any, draggedNode: Node) => {
      // Clear resize tracking when drag/resize stops
      if (draggedNode.type === 'highlightRegion') {
        resizeStartDimensionsRef.current.delete(draggedNode.id)
        resizeInitialDirectionRef.current.delete(draggedNode.id)
      }
      
      // Check if this was a duplicate operation
      if (duplicateNodeIdRef.current) {
        // Find the original node ID (the one that's not the duplicate)
        const originalNodeId = Array.from(dragStartPositionsRef.current.keys()).find(
          id => id !== duplicateNodeIdRef.current
        )
        
        if (originalNodeId) {
          const originalPosition = dragStartPositionsRef.current.get(originalNodeId)
          
          // Restore original node's draggability and ensure it's at original position
          // Make sure it exists and is visible
          setNodes((nds) => {
            return nds.map(n => {
              if (n.id === originalNodeId) {
                // Restore original node - make sure it's visible and draggable
                return { 
                  ...n, 
                  position: originalPosition || n.position,
                  draggable: true,
                  selected: false,
                  hidden: false
                }
              }
              if (n.id === duplicateNodeIdRef.current) {
                // Select the duplicate
                return { ...n, selected: true }
              }
              return { ...n, selected: false }
            })
          })
          
          // Clean up
          dragStartPositionsRef.current.delete(originalNodeId)
          duplicateNodeIdRef.current = null
          isAltPressedRef.current = false
        }
      } else {
        // Normal drag - clean up stored position
        dragStartPositionsRef.current.delete(draggedNode.id)
        duplicateNodeIdRef.current = null
      }
      
      // Disabled automatic swim lane assignment on drag
      // Users should manually assign nodes to swim lanes via the Edit Node modal
      // This prevents unwanted position changes when dragging nodes
    },
    [setNodes]
  )

  // Tidy up node positions with proper spacing
  // Horizontal layout tidy up function
  const tidyUpHorizontal = useCallback(() => {
    if (nodes.length === 0) return

    const HORIZONTAL_SPACING = 40 // 40px between nodes
    const NODE_WIDTH = 320
    const REGION_PADDING = 40 // 40px gap between region boundary and nodes inside

    // Separate regions, label nodes, and regular nodes
    const regions = nodes.filter(n => n.type === 'highlightRegion')
    const labelNodes = nodes.filter(n => n.data?.type === 'label')
    const regularNodes = nodes.filter(n => n.type !== 'highlightRegion' && n.data?.type !== 'label')

    if (regularNodes.length === 0) return

    // Build adjacency map
    const adjacencyMap = new Map<string, string[]>()
    const incomingEdges = new Map<string, number>()

    regularNodes.forEach(node => {
      adjacencyMap.set(node.id, [])
      incomingEdges.set(node.id, 0)
    })

    edges.forEach(edge => {
      const sourceChildren = adjacencyMap.get(edge.source) || []
      adjacencyMap.set(edge.source, [...sourceChildren, edge.target])
      incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1)
    })

    // Find start node(s)
    const startNodes = Array.from(incomingEdges.entries())
      .filter(([_, count]) => count === 0)
      .map(([nodeId]) => nodeId)

    if (startNodes.length === 0) {
      console.warn('No start node found')
      return
    }

    // BFS to assign horizontal positions and track parent-child relationships
    const horizontalOrder = new Map<string, number>()
    const parentMap = new Map<string, string>() // Track which node is the parent of each child
    const visited = new Set<string>()
    const queue: string[] = [...startNodes]

    // Start nodes at position 0
    startNodes.forEach(nodeId => {
      horizontalOrder.set(nodeId, 0)
    })

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const currentPosition = horizontalOrder.get(nodeId) || 0
      const children = adjacencyMap.get(nodeId) || []

      children.forEach(childId => {
        if (!visited.has(childId)) {
          // Position child at next position
          const newPosition = currentPosition + 1
          const existingPosition = horizontalOrder.get(childId)
          
          // If child already has a position (convergence), use the max
          if (existingPosition === undefined || newPosition > existingPosition) {
            horizontalOrder.set(childId, newPosition)
            parentMap.set(childId, nodeId) // Track parent
          }
          
          queue.push(childId)
        }
      })
    }

    // Assign Y positions: center child groups around their parent's Y position
    const yPositions = new Map<string, number>()
    const CHILD_VERTICAL_SPACING = 160 // Spacing between siblings in the same child group
    let currentYOffset = 300 // Start further down to allow room for spreading

    // First pass: assign Y to start nodes
    startNodes.forEach((nodeId, index) => {
      yPositions.set(nodeId, currentYOffset + (index * 200))
    })

    // Second pass: assign Y to all other nodes based on their parent
    // Child groups are centered around the parent's Y position
    const assignYPositions = (nodeId: string) => {
      const children = adjacencyMap.get(nodeId) || []
      if (children.length === 0) return
      
      const parentY = yPositions.get(nodeId) || 100
      
      // Calculate positions for children centered around parent's Y
      if (children.length === 1) {
        // Single child: align exactly with parent
        yPositions.set(children[0], parentY)
      } else {
        // Multiple children: center the group around parent's Y
        const totalHeight = (children.length - 1) * CHILD_VERTICAL_SPACING
        const startY = parentY - (totalHeight / 2)
        
        children.forEach((childId, index) => {
          if (!yPositions.has(childId)) {
            const childY = startY + (index * CHILD_VERTICAL_SPACING)
            yPositions.set(childId, childY)
          }
        })
      }
      
      // Recursively assign Y to each child's children
      children.forEach(childId => {
        assignYPositions(childId)
      })
    }

    // Start from each start node
    startNodes.forEach(nodeId => assignYPositions(nodeId))

    // Convert horizontal order to actual x,y positions
    const updatedNodes = regularNodes.map(node => {
      const position = horizontalOrder.get(node.id) || 0
      const xPosition = 100 + (position * (NODE_WIDTH + HORIZONTAL_SPACING))
      const yPosition = yPositions.get(node.id) || 100
      
      return {
        ...node,
        position: {
          x: xPosition,
          y: yPosition
        }
      }
    })

    // Adjust nodes inside regions to have proper padding
    // Include label nodes unchanged (they don't get tidied)
    const finalNodes = [...regions, ...labelNodes, ...updatedNodes].map(node => {
      // Skip if it's a region itself
      if (node.type === 'highlightRegion') {
        return node
      }
      
      // Skip if it's a label node (keep it unchanged)
      if (node.data?.type === 'label') {
        return node
      }

      // Check if this node has a parentId (belongs to a region)
      const nodeParentId = (node as any).parentId
      
      if (nodeParentId) {
        // Find the parent region
        const parentRegion = regions.find(region => region.id === nodeParentId)
        
        if (parentRegion) {
          // Get region boundaries
          const regionX = parentRegion.position.x
          const regionY = parentRegion.position.y
          const regionWidth = typeof parentRegion.style?.width === 'number' ? parentRegion.style.width : 600
          const regionHeight = typeof parentRegion.style?.height === 'number' ? parentRegion.style.height : 600

          let adjustedX = node.position.x
          let adjustedY = node.position.y

          // Enforce minimum REGION_PADDING (40px) from all edges
          
          // Left edge: ensure at least 40px from left boundary
          const minX = regionX + REGION_PADDING
          if (adjustedX < minX) {
            adjustedX = minX
          }

          // Right edge: ensure at least 40px from right boundary
          const maxX = regionX + regionWidth - REGION_PADDING - NODE_WIDTH
          if (adjustedX > maxX) {
            adjustedX = maxX
          }

          // Top edge: ensure at least 40px from top boundary
          const minY = regionY + REGION_PADDING
          if (adjustedY < minY) {
            adjustedY = minY
          }

          // Bottom edge: ensure at least 40px from bottom boundary
          const nodeHeight = 120 // Approximate height
          const maxY = regionY + regionHeight - REGION_PADDING - nodeHeight
          if (adjustedY > maxY) {
            adjustedY = maxY
          }

          return {
            ...node,
            position: {
              x: adjustedX,
              y: adjustedY
            }
          }
        }
      }

      return node
    })

    setNodes(finalNodes)

    // Save to database if journey exists
    if (currentJourneyId) {
      updateUserJourney(currentJourneyId, {
        flow_data: { 
          nodes: finalNodes, 
          edges,
          userRoleEmojiOverrides 
        }
      }).catch(error => {
        console.error('Error saving tidy layout:', error)
      })
    }
  }, [nodes, edges, setNodes, currentJourneyId])

  const tidyUpNodes = useCallback(() => {
    if (nodes.length === 0) return

    // Save snapshot for undo
    setUndoSnapshot({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      name: journeyName,
      description: journeyDescription,
      action: 'tidyUp'
    })

    // Check layout and use appropriate tidy up function
    if (journeyLayout === 'horizontal') {
      tidyUpHorizontal()
      return
    }

    // Use requestAnimationFrame to ensure DOM has been updated (for vertical layout)
    requestAnimationFrame(() => {
      const VERTICAL_GAP = 36
      const HORIZONTAL_GAP = 48
      const NODE_WIDTH = 320 // Width of nodes
      const DEFAULT_NODE_HEIGHT = 120 // Fallback height

      // Separate label nodes from regular nodes (label nodes don't get tidied)
      const labelNodes = nodes.filter(n => n.data?.type === 'label')
      const regularNodes = nodes.filter(n => n.data?.type !== 'label')

      // Get actual rendered heights from DOM
      const getNodeHeight = (nodeId: string): number => {
        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`)
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect()
          // Account for zoom level by using the transform scale
          const zoom = reactFlowInstanceRef.current?.getZoom() || 1
          const height = rect.height / zoom
          console.log(`Node ${nodeId} height:`, height, `px (zoom: ${zoom})`)
          return height
        }
        console.warn(`Node ${nodeId} not found in DOM, using default height`)
        return DEFAULT_NODE_HEIGHT
      }

    // Helper function to check if an edge has a label
    const hasEdgeLabel = (sourceId: string, targetId: string): boolean => {
      const edge = edges.find(e => e.source === sourceId && e.target === targetId)
      if (!edge?.data?.label) return false
      const label = edge.data.label
      return typeof label === 'string' && label.trim() !== ''
    }

    // Build adjacency map for graph traversal (only for regular nodes)
    const adjacencyMap = new Map<string, string[]>()
    const incomingEdges = new Map<string, number>()
    const parentMap = new Map<string, string[]>() // Track parents for each node

    regularNodes.forEach(node => {
      adjacencyMap.set(node.id, [])
      incomingEdges.set(node.id, 0)
      parentMap.set(node.id, [])
    })

    edges.forEach(edge => {
      const sourceChildren = adjacencyMap.get(edge.source) || []
      adjacencyMap.set(edge.source, [...sourceChildren, edge.target])
      incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1)
      
      // Track parent relationships
      const parents = parentMap.get(edge.target) || []
      parentMap.set(edge.target, [...parents, edge.source])
    })

    // Find start node (node with no incoming edges)
    const startNodes = Array.from(incomingEdges.entries())
      .filter(([_, count]) => count === 0)
      .map(([nodeId]) => nodeId)

    if (startNodes.length === 0) {
      console.warn('No start node found')
      return
    }

    // Assign levels and horizontal positions using BFS
    // For convergent nodes (multiple parents), level = max(parent levels) + 1
    const levels = new Map<string, number>()
    const horizontalPositions = new Map<string, number>()
    const visited = new Set<string>()
    const queue: Array<{ nodeId: string; level: number; branch: number }> = []

    // Start with all start nodes
    startNodes.forEach((nodeId, index) => {
      queue.push({ nodeId, level: 0, branch: index })
      levels.set(nodeId, 0)
      horizontalPositions.set(nodeId, index)
    })

    while (queue.length > 0) {
      const { nodeId, level, branch } = queue.shift()!
      
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const children = adjacencyMap.get(nodeId) || []
      
      if (children.length === 1) {
        // Single child - same branch
        const childId = children[0]
        if (!visited.has(childId)) {
          const currentLevel = levels.get(childId)
          const newLevel = level + 1
          // For convergent nodes, use max level from all parents
          if (currentLevel === undefined || newLevel > currentLevel) {
            levels.set(childId, newLevel)
          }
          horizontalPositions.set(childId, branch)
          queue.push({ nodeId: childId, level: newLevel, branch })
        }
      } else if (children.length > 1) {
        // Multiple children - create branches
        children.forEach((childId, index) => {
          if (!visited.has(childId)) {
            const childBranch = branch + index
            const currentLevel = levels.get(childId)
            const newLevel = level + 1
            // For convergent nodes, use max level from all parents
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
    // This also cascades to their children
    console.log('=== Post-processing: Fix convergent node levels ===')
    let levelChanged = true
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops
    
    while (levelChanged && iterations < maxIterations) {
      levelChanged = false
      iterations++
      
      nodes.forEach(node => {
        const parents = parentMap.get(node.id) || []
        
        if (parents.length >= 2) {
          // This is a convergent node - ensure it's at max(parent levels) + 1
          const parentLevels = parents.map(parentId => levels.get(parentId) || 0)
          const maxParentLevel = Math.max(...parentLevels)
          const correctLevel = maxParentLevel + 1
          const currentLevel = levels.get(node.id) || 0
          
          if (currentLevel !== correctLevel) {
            const nodeLabel = (node.data as any)?.label || node.id
            console.log(`  Convergent node ${nodeLabel}: updating level from ${currentLevel} to ${correctLevel} (max parent level: ${maxParentLevel})`)
            levels.set(node.id, correctLevel)
            levelChanged = true
          }
        } else if (parents.length === 1) {
          // Single parent - ensure level = parent level + 1
          const parentId = parents[0]
          const parentLevel = levels.get(parentId) || 0
          const correctLevel = parentLevel + 1
          const currentLevel = levels.get(node.id) || 0
          
          if (currentLevel !== correctLevel) {
            const nodeLabel = (node.data as any)?.label || node.id
            console.log(`  Node ${nodeLabel}: updating level from ${currentLevel} to ${correctLevel} (parent level: ${parentLevel})`)
            levels.set(node.id, correctLevel)
            levelChanged = true
          }
        }
      })
    }
    
    if (iterations >= maxIterations) {
      console.warn('Max iterations reached while fixing node levels - possible circular dependency')
    }

    // Post-process: Classify node layouts and ensure simple nodes are vertically aligned with their parent
    // This handles cases where a node might have been assigned a different horizontal position
    const nodeParentCount = new Map<string, number>()
    const nodeChildCount = new Map<string, number>()
    const nodeLayout = new Map<string, string>() // Store layout classification
    
    regularNodes.forEach(node => {
      const parents = parentMap.get(node.id) || []
      const children = adjacencyMap.get(node.id) || []
      nodeParentCount.set(node.id, parents.length)
      nodeChildCount.set(node.id, children.length)
    })
    
    // Classify nodes by layout type
    regularNodes.forEach(node => {
      const parentCount = nodeParentCount.get(node.id) || 0
      const childCount = nodeChildCount.get(node.id) || 0
      
      // Convergent node: Has 2+ incoming edges
      if (parentCount >= 2) {
        nodeLayout.set(node.id, 'Convergent node')
      }
      // Branch node: Has 0-1 incoming edges, 2+ outgoing edges
      else if (parentCount <= 1 && childCount >= 2) {
        nodeLayout.set(node.id, 'Branch node')
      }
      // Check if this is a divergent node or branch-child
      // Divergent node: Has a branch parent that has an outgoing edge directly connecting to a convergent node
      // Branch-child: Has a branch parent where all branches lead to branch-children (not convergent nodes)
      else if (parentCount === 1) {
        const parents = parentMap.get(node.id) || []
        const parentId = parents[0]
        const parentChildCount = nodeChildCount.get(parentId) || 0
        
        // Parent is a branch node (2+ children)
        if (parentChildCount >= 2) {
          // Check if the parent has a DIRECT edge to a convergent node
          // (one of the parent's children is a convergent node)
          const parentChildren = adjacencyMap.get(parentId) || []
          const convergentSiblings = parentChildren.filter(siblingId => {
            const siblingParentCount = nodeParentCount.get(siblingId) || 0
            return siblingParentCount >= 2
          })
          const parentHasDirectConvergentChild = convergentSiblings.length > 0
          
          // This node is divergent if its parent directly connects to a convergent node
          if (parentHasDirectConvergentChild) {
            nodeLayout.set(node.id, 'Divergent node')
            const nodeLabel = (node.data as any)?.label || node.id
            console.log(`Node ${nodeLabel} is Divergent: parent has direct edge to convergent node(s)`, 
              convergentSiblings.map(id => {
                const sibling = nodes.find(n => n.id === id)
                return (sibling?.data as any)?.label || id
              }))
          } else {
            // Branch-child: parent is branch node, but parent does not directly connect to convergent node
            nodeLayout.set(node.id, 'Branch-child node')
          }
        } else {
          // Simple node: Has 0-1 incoming and outgoing edges
          nodeLayout.set(node.id, 'Simple node')
        }
      }
      // Simple node: Has 0-1 incoming and outgoing edges
      else {
        nodeLayout.set(node.id, 'Simple node')
      }
    })
    
    // Apply branching layout
    console.log('=== Branching Layout ===')
    
    // First, identify branch nodes and check if they have divergent children
    const branchesWithLayout = new Map<string, boolean>() // branch node id -> should use branching layout
    const branchingXPositions = new Map<string, number>() // Store actual pixel X positions for branching layout nodes
    
    nodes.forEach(node => {
      const childCount = nodeChildCount.get(node.id) || 0
      
      if (childCount >= 2) {
        // This is a branch node - check if any child is divergent
        const children = adjacencyMap.get(node.id) || []
        const hasDivergentChild = children.some(childId => {
          const childLayout = nodeLayout.get(childId)
          return childLayout === 'Divergent node'
        })
        
        branchesWithLayout.set(node.id, !hasDivergentChild)
        const nodeLabel = (node.data as any)?.label || node.id
        
        if (hasDivergentChild) {
          console.log(`Branch node ${nodeLabel}: has divergent child, NOT using branching layout`)
        } else {
          console.log(`Branch node ${nodeLabel}: using branching layout`)
        }
      }
    })
    
    // First pass: ensure parent nodes have positions set
    const getNodeXPosition = (nodeId: string): number => {
      // Check branching positions first
      if (branchingXPositions.has(nodeId)) {
        return branchingXPositions.get(nodeId)!
      }
      // Fall back to horizontal position with formula
      const horizontalPos = horizontalPositions.get(nodeId) ?? 0
      return 100 + (horizontalPos * (NODE_WIDTH + HORIZONTAL_GAP))
    }
    
    // STEP 1: Position branch nodes first so convergent nodes can reference them
    // Process level by level to ensure parents are positioned before children
    console.log('=== STEP 1: Positioning Branch Nodes and Children First ===')
    const maxLevelForBranching = Math.max(...Array.from(levels.values()), 0)
    for (let level = 0; level <= maxLevelForBranching; level++) {
      const nodesAtLevel = Array.from(levels.entries())
        .filter(([_, l]) => l === level)
        .map(([nodeId]) => nodeId)
      
      nodesAtLevel.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId)
        if (!node) return
        
        const childCount = nodeChildCount.get(nodeId) || 0
        const parentCount = nodeParentCount.get(nodeId) || 0
        
        if (childCount >= 2 && branchesWithLayout.get(nodeId)) {
          const children = adjacencyMap.get(nodeId) || []
          const nodeLabel = (node.data as any)?.label || nodeId
          
          // Get the branch node's X position (may have been set by convergent logic above)
          let branchNodeX = branchingXPositions.get(nodeId)
          
          if (!branchNodeX) {
            // If not set yet, align with parent or use default
            if (parentCount === 1) {
              const parents = parentMap.get(nodeId) || []
              const parentId = parents[0]
              branchNodeX = branchingXPositions.has(parentId) 
                ? branchingXPositions.get(parentId)!
                : getNodeXPosition(parentId)
              const parentLabel = nodes.find(n => n.id === parentId)
              console.log(`  Branch node ${nodeLabel}: aligning with parent ${(parentLabel?.data as any)?.label || parentId} at x=${branchNodeX}`)
            } else if (parentCount === 0) {
              branchNodeX = 288 // Default center position for root
              console.log(`  Branch node ${nodeLabel}: root node, using default x=${branchNodeX}`)
            } else {
              branchNodeX = 288 // Default if multiple parents
              console.log(`  Branch node ${nodeLabel}: multiple parents, using default x=${branchNodeX}`)
            }
            branchingXPositions.set(nodeId, branchNodeX)
          } else {
            console.log(`  Branch node ${nodeLabel}: using pre-set position x=${branchNodeX}`)
          }
          
          // Position children centered around the branch node, 384px apart
          // For 2 children: branch-192, branch+192
          // For 3 children: branch-384, branch, branch+384
          const numChildren = children.length
          children.forEach((childId, index) => {
            // Calculate offset from center
            const offsetIndex = index - (numChildren - 1) / 2
            const childX = Math.round((branchNodeX + (offsetIndex * 384)) / 8) * 8
            branchingXPositions.set(childId, childX)
            const childLabel = nodes.find(n => n.id === childId)
            console.log(`  Branch child ${(childLabel?.data as any)?.label || childId}: positioned at x=${childX} (offset ${offsetIndex * 384} from parent x=${branchNodeX})`)
          })
        }
      })
    }
    
    // STEP 2: Now position convergent nodes - they can reference branch positions
    console.log('=== STEP 2: Aligning Convergent Nodes with Branch Ancestors ===')
    nodes.forEach(node => {
      const parentCount = nodeParentCount.get(node.id) || 0
      
      // If this is a convergent node (2+ parents)
      if (parentCount >= 2) {
        const parents = parentMap.get(node.id) || []
        const nodeLabel = (node.data as any)?.label || node.id
        
        // Check if any parent is divergent
        const divergentParent = parents.find(parentId => {
          const layout = nodeLayout.get(parentId)
          return layout === 'Divergent node'
        })
        
        if (divergentParent) {
          // Convergent node should have the SAME X as the branch node (not the divergent node)
          // The Y coordinate will naturally place it below the divergent due to level-based positioning
          
          // Get the branch node (parent of the divergent node)
          const divergentParents = parentMap.get(divergentParent) || []
          if (divergentParents.length > 0) {
            const branchNodeId = divergentParents[0]
            const branchNodeX = branchingXPositions.has(branchNodeId) 
              ? branchingXPositions.get(branchNodeId)!
              : getNodeXPosition(branchNodeId)
            
            // Convergent should be at the branch node's X (NOT divergent's X)
            branchingXPositions.set(node.id, branchNodeX)
            const divergentLabel = nodes.find(n => n.id === divergentParent)
            const branchLabel = nodes.find(n => n.id === branchNodeId)
            console.log(`  Convergent node ${nodeLabel}: aligned with branch node ${(branchLabel?.data as any)?.label || branchNodeId} (parent of divergent ${(divergentLabel?.data as any)?.label || divergentParent}) at x=${branchNodeX}`)
          }
        } else {
          // Find the branch node that these parents branch from
          // Traverse up from parents to find common ancestor that is a branch node
          const findBranchAncestor = (nodeId: string, visited = new Set<string>()): string | null => {
            if (visited.has(nodeId)) return null
            visited.add(nodeId)
            
            // Check if this node is a branch node with branching layout
            const childCount = nodeChildCount.get(nodeId) || 0
            if (childCount >= 2 && branchesWithLayout.get(nodeId)) {
              return nodeId
            }
            
            // Check parents
            const nodeParents = parentMap.get(nodeId) || []
            for (const parentId of nodeParents) {
              const result = findBranchAncestor(parentId, visited)
              if (result) return result
            }
            
            return null
          }
          
          // Search through ALL parents to find the branch ancestor, not just the first one
          // This ensures convergent nodes align with the branch parent, not branch children
          let branchAncestor: string | null = null
          for (const parentId of parents) {
            const ancestor = findBranchAncestor(parentId)
            if (ancestor) {
              branchAncestor = ancestor
              break
            }
          }
          
          if (branchAncestor && branchingXPositions.has(branchAncestor)) {
            const branchX = branchingXPositions.get(branchAncestor)!
            branchingXPositions.set(node.id, branchX)
            const branchLabel = nodes.find(n => n.id === branchAncestor)
            console.log(`  Convergent node ${nodeLabel}: aligned with branch node ${(branchLabel?.data as any)?.label || branchAncestor} at x=${branchX}`)
          } else {
            console.log(`  Convergent node ${nodeLabel}: No branch ancestor found (branchAncestor=${branchAncestor}, hasPosition=${branchAncestor ? branchingXPositions.has(branchAncestor) : 'N/A'})`)
          }
        }
      }
    })
    
    // STEP 3: Default: All nodes inherit their parent's X position
    // Only branch children, convergent nodes, and divergent nodes get different positions
    console.log('=== STEP 3: Setting Default X Positions (inherit from parent) ===')
    
    // Process nodes level by level to ensure parents are positioned before children
    const maxLevel = Math.max(...Array.from(levels.values()), 0)
    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = Array.from(levels.entries())
        .filter(([_, l]) => l === level)
        .map(([nodeId]) => nodeId)
      
      nodesAtLevel.forEach(nodeId => {
        // Skip if already has a position set by branching layout
        if (branchingXPositions.has(nodeId)) {
          return
        }
        
        const parents = parentMap.get(nodeId) || []
        
        // If node has a parent, inherit its X position
        if (parents.length === 1) {
          const parentId = parents[0]
          const parentX = branchingXPositions.has(parentId) 
            ? branchingXPositions.get(parentId)! 
            : getNodeXPosition(parentId)
          
          branchingXPositions.set(nodeId, parentX)
          const nodeLabel = (nodes.find(n => n.id === nodeId)?.data as any)?.label || nodeId
          const parentLabel = (nodes.find(n => n.id === parentId)?.data as any)?.label || parentId
          console.log(`  ${nodeLabel}: inheriting parent ${parentLabel}'s x=${parentX}`)
        }
        // If no parents (root node), use default or existing horizontal position
        else if (parents.length === 0) {
          const defaultX = getNodeXPosition(nodeId)
          branchingXPositions.set(nodeId, defaultX)
          const nodeLabel = (nodes.find(n => n.id === nodeId)?.data as any)?.label || nodeId
          console.log(`  ${nodeLabel}: root node at x=${defaultX}`)
        }
        // Convergent nodes already handled above
      })
    }

    // Debug: Log all branching X positions
    console.log('=== All Branching X Positions ===')
    console.log(`Total nodes: ${nodes.length}, Nodes with branching X: ${branchingXPositions.size}`)
    nodes.forEach(node => {
      const hasPos = branchingXPositions.has(node.id)
      const xPos = hasPos ? branchingXPositions.get(node.id) : 'MISSING'
      const label = (node.data as any)?.label || node.id
      if (!hasPos) {
        console.warn(`  ⚠️  ${label}: ${xPos}`)
      }
    })
    
    // Group nodes by level for vertical positioning
    const nodesByLevel = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      const nodesAtLevel = nodesByLevel.get(level) || []
      nodesByLevel.set(level, [...nodesAtLevel, nodeId])
    })

    // Calculate Y positions for each level, accounting for labeled edges and branch nodes
    const yPositionsByNode = new Map<string, number>()
    const maxLevels = Math.max(...Array.from(levels.values()), 0)
    
    let cumulativeY = 100 // Starting Y position
    
    for (let level = 0; level <= maxLevels; level++) {
      const nodesAtLevel = nodesByLevel.get(level) || []
      
      if (nodesAtLevel.length === 0) continue
      
      // Check if any node at the PREVIOUS level is a branch node
      // If so, multiply the gap by the number of child branches
      let branchGapMultiplier = 1
      if (level > 0) {
        const previousLevelNodes = nodesByLevel.get(level - 1) || []
        previousLevelNodes.forEach(parentId => {
          const childCount = nodeChildCount.get(parentId) || 0
          if (childCount >= 2 && branchesWithLayout.get(parentId)) {
            // Multiply gap by number of children
            branchGapMultiplier = Math.max(branchGapMultiplier, childCount)
            const parentLabel = (nodes.find(n => n.id === parentId)?.data as any)?.label || parentId
            console.log(`Branch node ${parentLabel} has ${childCount} children: multiplying vertical gap by ${childCount}`)
          }
        })
      }
      
      // Apply branch gap multiplier to cumulative Y before positioning nodes at this level
      if (branchGapMultiplier > 1) {
        const extraBranchGap = VERTICAL_GAP * (branchGapMultiplier - 1)
        cumulativeY += extraBranchGap
        console.log(`  Adding extra branch gap: ${extraBranchGap}px (${VERTICAL_GAP} × ${branchGapMultiplier - 1})`)
      }
      
      // For each node at this level, calculate its Y position
      nodesAtLevel.forEach(nodeId => {
        // Check if this node has any incoming edges with labels
        const parents = parentMap.get(nodeId) || []
        const hasLabeledIncomingEdge = parents.some(parentId => hasEdgeLabel(parentId, nodeId))
        
        // Add extra gap if there's a labeled incoming edge
        const extraGap = hasLabeledIncomingEdge ? VERTICAL_GAP : 0
        
        yPositionsByNode.set(nodeId, cumulativeY + extraGap)
      })
      
      // Calculate the maximum height at this level
      const maxHeightAtLevel = Math.max(
        ...nodesAtLevel.map(id => getNodeHeight(id)),
        DEFAULT_NODE_HEIGHT
      )
      
      // Check if any node at this level has a labeled incoming edge
      const anyNodeHasLabeledEdge = nodesAtLevel.some(nodeId => {
        const parents = parentMap.get(nodeId) || []
        return parents.some(parentId => hasEdgeLabel(parentId, nodeId))
      })
      
      // Update cumulative Y for next level
      // Add the max height of current level + standard gap + extra gap if any node has labeled edge
      const extraGap = anyNodeHasLabeledEdge ? VERTICAL_GAP : 0
      cumulativeY += maxHeightAtLevel + VERTICAL_GAP + extraGap
    }

    // Apply calculated positions to regular nodes (not label nodes)
    const tidiedRegularNodes = regularNodes.map(node => {
      const yPosition = yPositionsByNode.get(node.id) ?? 100
      const layout = nodeLayout.get(node.id) || 'Simple node'

      // Calculate X position - should always use branchingXPositions now
      let xPosition: number
      
      if (branchingXPositions.has(node.id)) {
        xPosition = branchingXPositions.get(node.id)!
      } else {
        // Fallback: this shouldn't happen if logic above is correct
        console.warn(`Node ${(node.data as any)?.label || node.id}: missing branching position, using fallback`)
        xPosition = getNodeXPosition(node.id)
      }
      
      // If this is a divergent node, add 200px offset to the right
      if (layout === 'Divergent node') {
        xPosition += 200
        console.log(`Divergent node ${(node.data as any)?.label || node.id}: adding 200px offset (x: ${xPosition - 200} -> ${xPosition})`)
      }

      return {
        ...node,
        data: {
          ...node.data,
          nodeLayout: layout
        },
        position: {
          x: xPosition,
          y: yPosition
        }
      }
    })
    
    // Combine tidied regular nodes with unchanged label nodes
    const updatedNodes = [...labelNodes, ...tidiedRegularNodes]
    
    // Log layout classifications and final positions for debugging
    console.log('=== Node Layout Classifications & Final Positions ===')
    updatedNodes.forEach(node => {
      const layout = (node.data as any).nodeLayout || 'Unknown'
      const label = (node.data as any).label || node.id
      const xPos = node.position.x
      const yPos = node.position.y
      console.log(`${label}: ${layout} @ (${xPos}, ${yPos})`)
    })

      setNodes(updatedNodes)

      // Save to database if journey exists
      if (currentJourneyId) {
        updateUserJourney(currentJourneyId, {
          flow_data: { 
            nodes: updatedNodes, 
            edges,
            userRoleEmojiOverrides 
          }
        }).catch(error => {
          console.error('Error saving tidy layout:', error)
        })
      }
    }) // End of requestAnimationFrame
  }, [nodes, edges, setNodes, currentJourneyId, journeyName, journeyDescription, journeyLayout, tidyUpHorizontal])

  // Handle edge label editing
  const handleEdgeLabelClick = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId)
    setEditingEdgeId(edgeId)
    setEdgeLabel((edge?.data?.label as string) || '')
    setShowEdgeLabelModal(true)
  }, [edges])

  // Save edge label
  const saveEdgeLabel = useCallback(() => {
    if (!editingEdgeId) return

    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === editingEdgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                label: edgeLabel,
              }
            }
          : edge
      )
    )

    setShowEdgeLabelModal(false)
    setEditingEdgeId(null)
    setEdgeLabel('')
  }, [editingEdgeId, edgeLabel, setEdges])

  // Delete edge label
  const deleteEdgeLabel = useCallback(() => {
    if (!editingEdgeId) return

    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === editingEdgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                label: undefined,
              }
            }
          : edge
      )
    )

    setShowEdgeLabelModal(false)
    setEditingEdgeId(null)
    setEdgeLabel('')
  }, [editingEdgeId, setEdges])

  // Define edge types with label handler
  const edgeTypes: EdgeTypes = useMemo(() => ({
    default: (props: any) => (
      <CustomEdge
        {...props}
        data={{
          ...props.data,
          onLabelClick: handleEdgeLabelClick,
        }}
      />
    ),
  }), [handleEdgeLabelClick])

  // Define node types with handlers
  const nodeTypes: NodeTypes = useMemo(() => ({
    start: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        onEdit={() => configureNode(props.id)}
        isConnecting={isConnecting}
        connectedEdges={edges}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
      />
    ),
    process: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        onEdit={() => configureNode(props.id)}
        isConnecting={isConnecting}
        connectedEdges={edges}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
      />
    ),
    decision: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        onEdit={() => configureNode(props.id)}
        isConnecting={isConnecting}
        connectedEdges={edges}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
      />
    ),
    end: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        onEdit={() => configureNode(props.id)}
        isConnecting={isConnecting}
        connectedEdges={edges}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
      />
    ),
    label: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={false}
        thirdParties={thirdParties}
        platforms={platforms}
        onEdit={() => configureNode(props.id)}
        isConnecting={isConnecting}
        connectedEdges={edges}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
      />
    ),
    highlightRegion: (props: any) => (
      <HighlightRegionNode
        {...props}
        onEdit={() => configureRegion(props.id)}
        data={{
          ...props.data,
          onExportRegion: handleExportRegion,
        }}
      />
    ),
  }), [configureNode, thirdParties, platforms, configureRegion, isConnecting, edges, userRoleEmojiOverrides, handleExportRegion])

  // Comment handlers
  const handleAddComment = useCallback(async (commentText: string) => {
    if (!currentJourneyId || !user) return
    
    setSavingComment(true)
    try {
      const newComment = await createUserJourneyComment(currentJourneyId, commentText, user.id)
      if (newComment) {
        setComments(prev => [{
          id: newComment.id,
          user_id: newComment.user_id,
          comment_text: newComment.comment_text,
          created_at: newComment.created_at,
          updated_at: newComment.updated_at
        }, ...prev])
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSavingComment(false)
    }
  }, [currentJourneyId, user])

  const handleEditComment = useCallback(async (commentId: string, commentText: string) => {
    setSavingComment(true)
    try {
      const updatedComment = await updateUserJourneyComment(commentId, commentText)
      if (updatedComment) {
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? {
                id: updatedComment.id,
                user_id: updatedComment.user_id,
                comment_text: updatedComment.comment_text,
                created_at: updatedComment.created_at,
                updated_at: updatedComment.updated_at
              }
            : c
        ))
      }
    } catch (error) {
      console.error('Error editing comment:', error)
    } finally {
      setSavingComment(false)
    }
  }, [])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setSavingComment(true)
    try {
      const success = await deleteUserJourneyComment(commentId)
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    } finally {
      setSavingComment(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <LoadingState message="Loading journey..." size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full">
      {/* Header */}
      <div className="space-y-3 mb-6 p-6 pb-0 flex-shrink-0">
        {/* Row 1: Back button and Unsaved changes */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={async () => {
              // Save changes before navigating if there are unsaved changes
              if (hasUnsavedChanges && journeyName.trim() && currentJourneyId) {
                try {
                  await saveJourney()
                } catch (error) {
                  console.error('Error saving journey before navigation:', error)
                  // Still navigate even if save fails
                }
              } else if (hasUnsavedChanges && journeyName.trim() && !currentJourneyId) {
                // For new journeys, save even if name is default (don't open modal, just save)
                try {
                  setSaving(true)
                  const sortedNodes = sortNodesForSaving(nodes)
                  const flowData = { 
                    nodes: sortedNodes, 
                    edges,
                    userRoleEmojiOverrides 
                  }
                  const created = await createUserJourney(
                    journeyName,
                    journeyDescription,
                    flowData,
                    selectedProjectId || null,
                    journeyLayout
                  )
                  if (created) {
                    await setUserJourneyLawFirms(created.id, selectedLawFirmIds)
                    if (selectedFolderId) {
                      await assignUserJourneysToFolder([created.id], selectedFolderId)
                    }
                    setHasUnsavedChanges(false)
                  }
                  setSaving(false)
                } catch (error) {
                  console.error('Error saving journey before navigation:', error)
                  setSaving(false)
                  // Still navigate even if save fails
                }
              }
              
              // Navigate after saving (or if no unsaved changes)
              if (journeyFolder) {
                const slug = nameToSlug(journeyFolder.name)
                navigate(`/user-journeys/${slug}`)
              } else {
                navigate('/user-journeys')
              }
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to User Journeys
          </Button>
          
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="text-sm text-gray-500 font-medium">
              Unsaved changes
            </div>
          )}
        </div>
        
        {/* Row 2: Title/Epic section and Action buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Epic on first line if present */}
            {selectedProjectId && (
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen size={14} className="text-gray-400" />
                <p className="text-sm text-gray-500">
                  {convertEmojis(projects.find(p => p.id === selectedProjectId)?.name || 'Unknown')}
                </p>
              </div>
            )}
            
            {/* Title and Status Badge on same row */}
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{convertEmojis(journeyName)}</h2>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                journeyStatus === 'shared' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {journeyStatus === 'shared' ? 'Shared' : 'Personal'}
              </span>
              
              <button
                onClick={() => setShowNameEditModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Edit journey name and description"
              >
                <Edit size={18} />
              </button>
            </div>
            {journeyDescription && (
              <p className="text-gray-600 mt-1">{renderMarkdown(journeyDescription)}</p>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            
          {/* Import Dropdown */}
          <div className="relative" ref={importDropdownRef}>
            <Button
              variant="outline"
              onClick={() => setShowImportDropdown(!showImportDropdown)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              Import
              <ChevronDown size={16} />
            </Button>
            
            {showImportDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    setShowImportTranscriptModal(true)
                    setShowImportDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <Sparkles size={16} />
                  <span>Import from Transcript</span>
                </button>
                <button
                  onClick={() => {
                    setShowImportImageModal(true)
                    setShowImportDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <ImageIcon size={16} />
                  <span>Import from Image</span>
                </button>
              </div>
            )}
          </div>

          {/* Share Button - show if journey is saved */}
          {currentJourneyId && (
            <Button
              variant="outline"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Share2 size={16} />
              Share
            </Button>
          )}

          <Button
            onClick={() => {
              // If name has been changed from default or description is filled, save directly
              if (journeyName !== 'User Journey 01' || journeyDescription.trim()) {
                saveJourney()
              } else {
                setShowSaveModal(true)
              }
            }}
            className="flex items-center gap-2 whitespace-nowrap"
            disabled={saving || justSaved}
          >
            {justSaved ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              <>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Journey'}
              </>
            )}
          </Button>

            {/* More Options Menu */}
            <OptionsMenu
              items={[
                {
                  label: 'Export as JSON',
                  icon: Download,
                  onClick: exportJourney
                },
                {
                  label: 'Import JSON',
                  icon: Upload,
                  onClick: () => setShowImportJsonModal(true)
                }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Content with React Flow and Comments Panel */}
      <div className="flex-1 flex overflow-hidden relative" style={{ minHeight: 0 }}>
        {/* React Flow Canvas */}
        <div className={`flex-1 bg-white rounded-lg border overflow-hidden transition-all duration-300 mx-6 mb-6 ${showComments ? 'mr-0' : ''}`} style={{ minHeight: 0 }}>
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={(event) => {
            // Only close menus if clicking directly on the pane (not on a node or button)
            const target = event.target as HTMLElement
            // Check if click is on a node, button, or other interactive element
            const isNode = target.closest('.react-flow__node')
            const isButton = target.closest('button') || target.tagName === 'BUTTON'
            const isInteractive = target.closest('[role="button"]') || target.closest('a')
            
            // Only close if clicking directly on the pane background
            if (!isNode && !isButton && !isInteractive) {
              const customEvent = new CustomEvent('reactflow-pane-click')
              document.dispatchEvent(customEvent)
            }
          }}
          onMoveStart={(event, viewport) => {
            // Only close menus if panning started from the pane (not from a node drag)
            // Check if any node is currently being dragged
            const isDraggingNode = nodes.some(node => node.dragging === true)
            if (!isDraggingNode) {
              const customEvent = new CustomEvent('reactflow-pan-start')
              document.dispatchEvent(customEvent)
            }
          }}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance
          }}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            style: { strokeWidth: 3, stroke: '#9ca3af' },
            interactionWidth: 50
          }}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={!isSpacePressed}
          nodesConnectable={true}
          nodesFocusable={true}
          elementsSelectable={true}
          selectNodesOnDrag={!isSpacePressed}
          multiSelectionKeyCode="Shift"
          deleteKeyCode={null}
          edgesReconnectable={true}
          edgesFocusable={true}
          snapToGrid={true}
          snapGrid={[15, 15]}
          style={{ width: '100%', height: '100%' }}
        >
          <Controls />
          <MiniMap />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={12} 
            size={1}
            color="#9ca3af"
            bgColor="#e5e7eb"
          />
          <KeyboardZoomHandler />
          <Panel position="top-right">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={tidyUpNodes}
                className="flex items-center gap-2"
                disabled={nodes.length === 0}
              >
                
                Tidy Up
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditWithAIModal(true)}
                className="flex items-center gap-2"
                disabled={nodes.length === 0}
              >
                <Sparkles size={16} />
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={smartAddNode}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Node
              </Button>
              <Button
                variant="outline"
                onClick={addHighlightRegion}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Region
              </Button>
            </div>
          </Panel>
        </ReactFlow>
        </div>

        {/* History Column - Full Height */}
        {currentJourneyId && (
          <div className="absolute top-0 right-0 bottom-0 z-40">
            <HistorySection
              entityId={currentJourneyId}
              entityType="user journey"
              comments={comments}
              decisions={[]}
              auditHistory={[]}
              user={user}
              allUsers={workspaceUsers}
              showHistory={showComments}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              saving={savingComment}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Toggle Comments Button - only show if journey exists */}
      {currentJourneyId && (
        <button
          onClick={() => setShowComments(!showComments)}
          className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
            showComments ? 'right-[384px]' : 'right-0'
          }`}
          title={showComments ? 'Hide history' : 'Show history (Press C)'}
        >
          {showComments ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      )}

      {/* Edit Node Modal */}
      <EditNodeModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setIsAddingNewNode(false)
        }}
        node={configuringNode}
        isAddingNewNode={isAddingNewNode}
        userRoles={userRoles}
        availableRegions={nodes
          .filter((n) => n.type === 'highlightRegion')
          .map((n) => ({
            id: n.id,
            label: (n.data as any).label || 'Untitled Region'
          }))}
        journeyLayout={journeyLayout}
        existingNodes={nodes}
        onSave={saveNodeConfiguration}
        onDelete={configuringNode ? () => {
          // Delete the node directly (confirmation handled in modal)
          setNodes((nds) => nds.filter((node) => node.id !== configuringNode.id))
          setEdges((eds) => eds.filter((edge) => edge.source !== configuringNode.id && edge.target !== configuringNode.id))
        } : undefined}
        userRoleEmojiOverrides={userRoleEmojiOverrides}
        onUpdateEmojiOverride={handleUpdateEmojiOverride}
        onCreateUserRole={async (name: string, colour: string, icon?: string) => {
          try {
            const userRole = await createUserRole(name, colour, icon)
            if (userRole) {
              // Note: The parent component (WorkspaceDataFetcher) should refresh userRoles
              // For now, we'll return the created role so EditNodeModal can use it immediately
              return userRole
            }
            return null
          } catch (error) {
            console.error('Error creating user role:', error)
            return null
          }
        }}
        onThirdPartyCreated={async (thirdParty) => {
          // Refresh third parties list
          if (workspaceId) {
            const updatedThirdParties = await getThirdParties(workspaceId)
            setThirdParties(updatedThirdParties)
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={cancelDeleteNode}
          title="Delete Node"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={cancelDeleteNode}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDeleteNode}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to delete this node? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Edge Label Modal */}
      {showEdgeLabelModal && (
        <Modal
          isOpen={showEdgeLabelModal}
          onClose={() => {
            setShowEdgeLabelModal(false)
            setEditingEdgeId(null)
            setEdgeLabel('')
          }}
          title="Edge Label"
          footerContent={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onClick={deleteEdgeLabel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove Label
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEdgeLabelModal(false)
                    setEditingEdgeId(null)
                    setEdgeLabel('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={saveEdgeLabel}
                >
                  Save Label
                </Button>
              </div>
            </div>
          }
        >
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Text <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
              </label>
              <EmojiAutocomplete
                value={edgeLabel}
                onChange={setEdgeLabel}
                placeholder="e.g., 'Yes', 'No', 'Next', 'Cancel'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                multiline={true}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    saveEdgeLabel()
                  }
                  // Shift+Enter creates a new line (default behavior)
                }}
              />
              <p className="mt-2 text-sm text-gray-500">
                Add a label to describe this connection or transition. Press Shift+Enter for a new line.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Journey Details Modal */}
      <EditJourneyModal
        isOpen={showNameEditModal}
        onClose={() => {
          setShowNameEditModal(false)
          setSelectedLawFirmIds([])
          setLawFirmSearchQuery('')
        }}
        onSave={async () => {
          if (!journeyName.trim()) {
            return
          }

          try {
            // Sort nodes to ensure parents come before children
            const sortedNodes = sortNodesForSaving(nodes)
            const flowData = { nodes: sortedNodes, edges }

            if (currentJourneyId) {
              // Update existing journey
              await updateUserJourney(currentJourneyId, {
                name: journeyName,
                description: journeyDescription,
                layout: journeyLayout,
                status: journeyStatus,
                flow_data: flowData,
                project_id: selectedProjectId || null
              })
              
              // Save law firm associations
              await setUserJourneyLawFirms(currentJourneyId, selectedLawFirmIds)
              
              console.log('Journey updated successfully')
              setHasUnsavedChanges(false)
            } else {
              // Create new journey
              const created = await createUserJourney(
                journeyName,
                journeyDescription,
                flowData,
                selectedProjectId || null,
                journeyLayout
              )
              
              if (created) {
                // Save law firm associations
                await setUserJourneyLawFirms(created.id, selectedLawFirmIds)
                
                // Assign to folder if folderId was provided
                if (selectedFolderId) {
                  await assignUserJourneysToFolder([created.id], selectedFolderId)
                }
                
                console.log('Journey created successfully:', created)
                setCurrentJourneyId(created.id)
                setHasUnsavedChanges(false)
              }
            }
          } catch (error) {
            console.error('Error saving journey details:', error)
            alert('Failed to save journey. Please try again.')
            return
          }
          
          setShowNameEditModal(false)
        }}
        journeyName={journeyName}
        journeyDescription={journeyDescription}
        journeyStatus={journeyStatus}
        selectedProjectId={selectedProjectId}
        selectedLawFirmIds={selectedLawFirmIds}
        lawFirmSearchQuery={lawFirmSearchQuery}
        projects={projects}
        lawFirms={lawFirms}
        onNameChange={setJourneyName}
        onDescriptionChange={setJourneyDescription}
        onStatusChange={setJourneyStatus}
        onProjectChange={setSelectedProjectId}
        onLawFirmSearchChange={setLawFirmSearchQuery}
        onLawFirmToggle={(firmId, checked) => {
          if (checked) {
            setSelectedLawFirmIds(prev => [...prev, firmId])
          } else {
            setSelectedLawFirmIds(prev => prev.filter(id => id !== firmId))
          }
        }}
        onAddLawFirmClick={() => setShowAddLawFirmModal(true)}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {currentJourneyId ? 'Update' : 'Save'} User Journey
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Epic
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Epic</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journey Name *
                </label>
                <input
                  type="text"
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter journey name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={journeyDescription}
                  onChange={(e) => setJourneyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Law Firms
                </label>
                <input
                  type="text"
                  value={lawFirmSearchQuery}
                  onChange={(e) => setLawFirmSearchQuery(e.target.value)}
                  placeholder="Search law firms..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                />
                <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                  {lawFirms
                    .filter(firm => 
                      lawFirmSearchQuery.trim() === '' || 
                      firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
                    )
                    .map(firm => (
                      <label
                        key={firm.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLawFirmIds.includes(firm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLawFirmIds(prev => [...prev, firm.id])
                            } else {
                              setSelectedLawFirmIds(prev => prev.filter(id => id !== firm.id))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{firm.name}</span>
                      </label>
                    ))}
                  {lawFirms.filter(firm => 
                    lawFirmSearchQuery.trim() === '' || 
                    firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">No law firms found</p>
                      <Button
                        variant="outline"
                        size="small"
                        icon={Plus}
                        onClick={() => {
                          setShowAddLawFirmModal(true)
                        }}
                      >
                        Add Law Firm
                      </Button>
                    </div>
                  )}
                </div>
                {selectedLawFirmIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedLawFirmIds.length} law firm{selectedLawFirmIds.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveJourney}
                disabled={saving || !journeyName.trim()}
              >
                {saving ? 'Saving...' : (currentJourneyId ? 'Update Journey' : 'Save Journey')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Image Modal */}
      <ImportJourneyImageModal
        isOpen={showImportImageModal}
        onClose={() => setShowImportImageModal(false)}
        onImport={handleImportFromImage}
        userRoles={userRoles.map(role => role.name)}
        currentJourneyLayout={journeyLayout}
        hasExistingNodes={nodes.length > 0}
      />

      {/* Import JSON Modal */}
      <Modal
        isOpen={showImportJsonModal}
        onClose={() => {
          setShowImportJsonModal(false)
          setImportJsonText('')
          setImportJsonError(null)
        }}
        title="Import Journey from JSON"
        size="lg"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportJsonModal(false)
                setImportJsonText('')
                setImportJsonError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromJson}
              disabled={!importJsonText.trim()}
            >
              Import
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Paste your exported journey JSON below to import it.
          </p>
          
          <div>
            <textarea
              value={importJsonText}
              onChange={(e) => {
                setImportJsonText(e.target.value)
                setImportJsonError(null)
              }}
              placeholder='Paste your JSON here, e.g.:
{
  "name": "User Journey",
  "description": "Description",
  "nodes": [...],
  "edges": [...]
}'
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {importJsonError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{importJsonError}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Import Transcript Modal */}
      <ImportJourneyTranscriptModal
        isOpen={showImportTranscriptModal}
        onClose={() => setShowImportTranscriptModal(false)}
        onImport={handleImportFromTranscript}
        transcriptText={importTranscriptText}
        onTranscriptTextChange={setImportTranscriptText}
        error={importTranscriptError}
        onErrorChange={setImportTranscriptError}
        loading={importTranscriptLoading}
        progressMessage={importTranscriptProgress}
        layout={importTranscriptLayout}
        onLayoutChange={setImportTranscriptLayout}
        hasExistingNodes={nodes.length > 0}
        currentJourneyLayout={journeyLayout}
      />

      {/* Edit with AI Modal */}
      <Modal
        isOpen={showEditWithAIModal}
        onClose={() => {
          if (!editAILoading) {
            setShowEditWithAIModal(false)
            setEditInstruction('')
            setEditAIError(null)
            setEditAIProgress('')
          }
        }}
        title="Edit Journey with AI"
        size="lg"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (!editAILoading) {
                  setShowEditWithAIModal(false)
                  setEditInstruction('')
                  setEditAIError(null)
                  setEditAIProgress('')
                }
              }}
              disabled={editAILoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditWithAI}
              disabled={!editInstruction.trim() || editAILoading}
            >
              {editAILoading ? (
                <>
                  <Sparkles size={16} className="animate-pulse mr-2" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">
              <Sparkles size={14} className="inline mr-1" />
              Natural Language Editing
            </p>
            <p className="text-sm text-blue-700">
              Describe the changes you want to make to your journey. The AI will understand 
              and apply your instructions automatically.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to change?
            </label>
            <textarea
              value={editInstruction}
              onChange={(e) => {
                setEditInstruction(e.target.value)
                setEditAIError(null)
              }}
              placeholder={
                nodes.filter(n => n.selected).length > 0
                  ? `Examples (with ${nodes.filter(n => n.selected).length} node${nodes.filter(n => n.selected).length !== 1 ? 's' : ''} selected):
• "Update the user role of the selected nodes to Admin"
• "Change the variant of selected nodes to Third party"
• "Replace Amicus with ThirdFort in the selected nodes"
• "Add a bullet point 'Review required' to selected nodes"
• "Change selected nodes to use Fee Earner role"`
                  : `Examples:
• "Replace Amicus with ThirdFort for all third parties"
• "Add a step for ID verification after the onboarding"
• "Change all Fee Earner roles to Admin"
• "Remove the MLRO escalation branch"
• "Rename all steps mentioning CMS to use the word System instead"

💡 Tip: Select nodes first for targeted edits!`
              }
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={editAILoading}
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Current journey:</strong> {nodes.length} nodes, {edges.length} edges
              {nodes.filter(n => n.selected).length > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">
                  • {nodes.filter(n => n.selected).length} node{nodes.filter(n => n.selected).length !== 1 ? 's' : ''} selected
                </span>
              )}
            </p>
          </div>

          {editAIError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{editAIError}</p>
            </div>
          )}

          {editAILoading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Sparkles size={14} className="animate-pulse mr-2" />
                {editAIProgress || 'AI is analyzing your journey and applying changes... This may take a moment.'}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Region Configuration Modal */}
      {showRegionConfigModal && configuringRegion && (
        <Modal
          isOpen={showRegionConfigModal}
          onClose={() => {
            setShowRegionConfigModal(false)
            setConfiguringRegion(null)
          }}
          title="Edit Region"
          size="md"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRegionConfigModal(false)
                  setConfiguringRegion(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveRegionConfiguration}
                disabled={!regionConfigForm.label.trim()}
              >
                Save
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region Label *
              </label>
              <input
                type="text"
                value={regionConfigForm.label}
                onChange={(e) => setRegionConfigForm(prev => ({ ...prev, label: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Authentication Flow"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { color: '#fef3c7', border: '#fbbf24', name: 'Yellow' },
                  { color: '#dbeafe', border: '#3b82f6', name: 'Blue' },
                  { color: '#d1fae5', border: '#10b981', name: 'Green' },
                  { color: '#fee2e2', border: '#ef4444', name: 'Red' },
                  { color: '#f3e8ff', border: '#a855f7', name: 'Purple' },
                  { color: '#e0e7ff', border: '#6366f1', name: 'Indigo' },
                  { color: '#fce7f3', border: '#ec4899', name: 'Pink' },
                  { color: '#fef08a', border: '#eab308', name: 'Lime' },
                  { color: '#ccfbf1', border: '#14b8a6', name: 'Teal' },
                  { color: '#fecaca', border: '#f87171', name: 'Light Red' },
                  { color: '#e5e7eb', border: '#9ca3af', name: 'Gray' },
                  { color: '#fed7aa', border: '#fb923c', name: 'Orange' },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => setRegionConfigForm(prev => ({ 
                      ...prev, 
                      backgroundColor: preset.color,
                      borderColor: preset.border
                    }))}
                    className={`
                      w-12 h-12 rounded-md border-2 transition-all
                      ${regionConfigForm.backgroundColor === preset.color 
                        ? 'ring-2 ring-blue-500 ring-offset-2' 
                        : 'hover:scale-110'
                      }
                    `}
                    style={{
                      backgroundColor: preset.color,
                      borderColor: preset.border,
                    }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600">
                💡 Tip: Drag nodes onto the region to group them. When you move the region, all nodes inside will move with it.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Law Firm Modal - Opens from Edit Journey Details when no search results */}
      <LawFirmForm
        isOpen={showAddLawFirmModal}
        isEditing={false}
        lawFirm={newLawFirm}
        loading={creatingLawFirm}
        onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
        onSubmit={handleCreateLawFirmFromModal}
        onClose={() => {
          setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
          setShowAddLawFirmModal(false)
        }}
      />

      {/* Share Modal */}
      {showShareModal && currentJourneyId && (
        <Modal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            setCopySuccess(false)
          }}
          title="Share User Journey"
          size="md"
          footerContent={
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowShareModal(false)
                  setCopySuccess(false)
                }}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Anyone with this link can view this journey (no login required).
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/public/user-journey/${nodes.length > 0 ? (nodes[0] as any).data?.journeyShortId || currentJourneyId : currentJourneyId}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Get the journey to find its short_id
                      const journey = await getUserJourneyById(currentJourneyId)
                      const shareUrl = `${window.location.origin}/public/user-journey/${journey?.short_id}`
                      await navigator.clipboard.writeText(shareUrl)
                      setCopySuccess(true)
                      setTimeout(() => setCopySuccess(false), 2000)
                    } catch (error) {
                      console.error('Failed to copy:', error)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {copySuccess ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon size={16} />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Anyone with this link can view this journey (no login required). This journey is currently {journeyStatus === 'shared' ? 'shared' : 'personal'}.
              </p>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
