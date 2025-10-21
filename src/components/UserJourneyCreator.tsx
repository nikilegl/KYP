import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from './DesignSystem/components/Button'
import { UserJourneyNode } from './DesignSystem/components/UserJourneyNode'
import { HighlightRegionNode } from './DesignSystem/components/HighlightRegionNode'
import { CustomEdge } from './DesignSystem/components/CustomEdge'
import { SegmentedControl } from './DesignSystem/components/SegmentedControl'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import { Save, Plus, Download, Upload, ArrowLeft, Edit, FolderOpen, Check, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { ImportJourneyImageModal } from './ImportJourneyImageModal'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import type { UserRole, Project, LawFirm, ThirdParty } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { getProjects, createUserJourney, updateUserJourney, getUserJourneyById } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import { getThirdParties } from '../lib/database/services/thirdPartyService'
import type { AnalyzedJourney } from '../lib/services/aiImageAnalysisService'
import { convertTranscriptToJourney, editJourneyWithAI } from '../lib/aiService'
import { generateTranscriptToJourneyPrompt } from '../lib/prompts/transcript-to-journey-prompt'
import { calculateVerticalJourneyLayout } from '../lib/services/verticalJourneyLayoutCalculator'
import { calculateHorizontalJourneyLayout } from '../lib/services/horizontalJourneyLayoutCalculator'

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

export function UserJourneyCreator({ userRoles = [], projectId, journeyId, thirdParties: initialThirdParties }: UserJourneyCreatorProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstanceRef = useRef<any>(null)
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(initialThirdParties || [])
  const [journeyName, setJourneyName] = useState('User Journey 01')
  const [journeyDescription, setJourneyDescription] = useState('')
  const [journeyLayout, setJourneyLayout] = useState<'vertical' | 'horizontal'>('vertical')
  const [showNameEditModal, setShowNameEditModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configuringNode, setConfiguringNode] = useState<Node | null>(null)
  const [isAddingNewNode, setIsAddingNewNode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)
  const [configForm, setConfigForm] = useState({
    label: '',
    type: 'process' as 'start' | 'process' | 'decision' | 'end',
    variant: 'Legl' as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | '',
    thirdPartyName: '' as string,
    userRole: null as UserRole | null,
    bulletPoints: [] as string[],
    notifications: [] as Notification[],
    customProperties: {} as Record<string, unknown>,
    swimLane: null as string | null // Region ID that this node belongs to
  })
  const [showEdgeLabelModal, setShowEdgeLabelModal] = useState(false)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [currentJourneyId, setCurrentJourneyId] = useState<string | null>(journeyId || null)
  const [loading, setLoading] = useState(true)
  const [showImportImageModal, setShowImportImageModal] = useState(false)
  const [showImportJsonModal, setShowImportJsonModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [importJsonError, setImportJsonError] = useState<string | null>(null)
  const [showImportTranscriptModal, setShowImportTranscriptModal] = useState(false)
  const [importTranscriptText, setImportTranscriptText] = useState('')
  const [importTranscriptError, setImportTranscriptError] = useState<string | null>(null)
  const [importTranscriptLoading, setImportTranscriptLoading] = useState(false)
  const [importTranscriptLayout, setImportTranscriptLayout] = useState<'vertical' | 'horizontal'>('vertical')
  const [showEditWithAIModal, setShowEditWithAIModal] = useState(false)
  const [editInstruction, setEditInstruction] = useState('')
  const [editAIError, setEditAIError] = useState<string | null>(null)
  const [editAILoading, setEditAILoading] = useState(false)
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
  
  // Undo state - stores snapshot before Tidy Up or AI Edit
  const [undoSnapshot, setUndoSnapshot] = useState<{
    nodes: Node[]
    edges: Edge[]
    name: string
    description: string
    action: 'tidyUp' | 'aiEdit'
  } | null>(null)
  
  // Ref to track bullet point input elements
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // History for undo functionality
  const [history, setHistory] = useState<Node[][]>([])
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

  // Keyboard shortcut listener for Cmd+Z / Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with native undo in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        // Only undo if we have a snapshot
        if (undoSnapshot) {
          event.preventDefault()
          handleUndo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undoSnapshot, handleUndo])

  // Load projects and journey on mount
  useEffect(() => {
    loadData()
  }, [])

  // Update all nodes when layout changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          journeyLayout
        }
      }))
    )
  }, [journeyLayout, setNodes])

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
              const thirdPartiesData = await getThirdParties(workspaceUser.workspace_id)
              setThirdParties(thirdPartiesData)
            }
          }
        }
      }
      
      // Check if there's an ID in the URL query params
      const urlJourneyId = searchParams.get('id')
      const urlProjectId = searchParams.get('projectId')
      const loadJourneyId = urlJourneyId || journeyId
      
      if (loadJourneyId) {
        // Load existing journey
        const journey = await getUserJourneyById(loadJourneyId)
        if (journey) {
          setCurrentJourneyId(journey.id)
          setJourneyName(journey.name)
          setJourneyDescription(journey.description || '')
          setJourneyLayout(journey.layout || 'vertical')
          setSelectedProjectId(journey.project_id || '')
          
          // Load associated law firms
          const lawFirmIds = await getUserJourneyLawFirms(journey.id)
          setSelectedLawFirmIds(lawFirmIds)
          
          if (journey.flow_data) {
            // Ensure nodes are selectable
            const nodesWithSelection = journey.flow_data.nodes.map(node => ({
              ...node,
              selectable: true
            }))
            setNodes(nodesWithSelection)
            setEdges(journey.flow_data.edges)
          }
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
  const onNodeDragStart = useCallback(() => {
    if (!isUndoing.current) {
      const snapshot = JSON.parse(JSON.stringify(nodes))
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
  }, [nodes, historyIndex])

  // Undo functionality
  const undo = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      isUndoing.current = true
      const previousState = history[historyIndex]
      setNodes(JSON.parse(JSON.stringify(previousState)))
      setHistoryIndex((prev) => prev - 1)
      
      // Reset the flag after state updates
      setTimeout(() => {
        isUndoing.current = false
      }, 50)
    }
  }, [historyIndex, history, setNodes])

  // Keyboard shortcut for undo (Command+Z / Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with native undo in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        // Only prevent default if we have history to undo
        if (historyIndex >= 0 && history[historyIndex]) {
          event.preventDefault()
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, historyIndex, history])

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

  // Copy selected nodes to clipboard (Command+C / Ctrl+C)
  const copySelectedNodes = useCallback(async () => {
    const selectedNodes = nodes.filter(node => node.selected)
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
    // Get edges that connect the selected nodes
    const relevantEdges = edges.filter(edge => 
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )

    const copyData = {
      nodes: selectedNodes,
      edges: relevantEdges
    }

    // Store in state for fallback
    setCopiedNodes(selectedNodes)
    setCopiedEdges(relevantEdges)

    // Copy to clipboard as JSON
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
      let copyData: { nodes: Node[], edges: Edge[] } | null = null
      
      try {
        const clipboardText = await navigator.clipboard.readText()
        copyData = JSON.parse(clipboardText)
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

      // Create ID mapping for nodes
      const idMapping = new Map<string, string>()
      const newNodes: Node[] = copyData.nodes.map(node => {
        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        idMapping.set(node.id, newId)
        
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 50, // Offset by 50px to make it visible
            y: node.position.y + 50
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
  }, [copiedNodes, copiedEdges, setNodes, setEdges])

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey
      
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (isModifierPressed) {
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault()
          copySelectedNodes()
        } else if (event.key === 'v' || event.key === 'V') {
          // Don't prevent default for paste - let pasteNodes decide if it should handle it
          // This allows image paste handlers (like ImportJourneyImageModal) to work
          pasteNodes()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [copySelectedNodes, pasteNodes])

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, data: {} }, eds)),
    [setEdges]
  )

  // Validate connections (optional - can be enhanced with more logic)
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    // Basic validation - you can add more sophisticated logic here
    return connection.source !== connection.target
  }, [])

  // Smart add node - opens modal to configure node before adding
  const smartAddNode = useCallback(() => {
    const hasStartNode = nodes.some(node => node.type === 'start')
    const nodeType = hasStartNode ? 'process' : 'start'
    const typeLabels = {
      start: 'Start',
      process: 'Middle',
      decision: 'Decision',
      end: 'End'
    }
    
    // Set up form for new node
    setConfigForm({
      label: `New ${typeLabels[nodeType]}`,
      type: nodeType,
      variant: 'Legl',
      thirdPartyName: '',
      userRole: null,
      bulletPoints: [''],
      notifications: [],
      customProperties: {},
      swimLane: null
    })
    
    setIsAddingNewNode(true)
    setConfiguringNode(null)
    setShowConfigModal(true)
  }, [nodes])

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
      const flowData = { nodes: sortedNodes, edges }
      
      if (currentJourneyId) {
        // Update existing journey
        const updated = await updateUserJourney(currentJourneyId, {
          name: journeyName,
          description: journeyDescription,
          layout: journeyLayout,
          flow_data: flowData,
          project_id: selectedProjectId || null
        })
        
        if (updated) {
          // Save law firm associations
          await setUserJourneyLawFirms(currentJourneyId, selectedLawFirmIds)
          
          console.log('Journey updated successfully:', updated)
          setJustSaved(true)
          setTimeout(() => setJustSaved(false), 3000)
        }
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
          
          console.log('Journey created successfully:', created)
          setCurrentJourneyId(created.id)
          setJustSaved(true)
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
  }, [journeyName, journeyDescription, nodes, edges, selectedProjectId, currentJourneyId, sortNodesForSaving, journeyLayout, selectedLawFirmIds])

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
      // Set journey metadata
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

      // Convert analyzed regions to React Flow nodes (if any)
      const regionNodes: Node[] = (analyzedJourney.regions || []).map((region) => ({
        id: region.id,
        type: region.type,
        position: region.position,
        style: region.style,
        data: region.data,
        draggable: region.draggable,
        selectable: region.selectable
      }))

      // Convert analyzed nodes to React Flow nodes
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
          id: node.id,
          type: node.type,
          position: node.position,
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
            journeyLayout: analyzedJourney.layout || journeyLayout
          }
        }

        // If node belongs to a region, set parentId for organizational purposes
        // Note: We don't set extent='parent' to allow dragging nodes between regions
        if (matchingRegion) {
          baseNode.parentId = matchingRegion.id
        }

        return baseNode
      })

      // Convert analyzed edges to React Flow edges
      const flowEdges: Edge[] = analyzedJourney.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'custom',
        data: edge.data || { label: '' }
      }))

      // Combine regions and nodes (regions first so they render behind)
      setNodes([...regionNodes, ...flowNodes])
      setEdges(flowEdges)

      // Close the modal
      setShowImportImageModal(false)

      // Show success message
      const regionText = regionNodes.length > 0 ? `, ${regionNodes.length} regions` : ''
      alert(`Successfully imported journey with ${flowNodes.length} nodes${regionText}, and ${flowEdges.length} connections!`)
    } catch (error) {
      console.error('Error processing imported journey:', error)
      alert('Error processing the imported journey. Please try again.')
    }
  }, [userRoles, thirdParties, setNodes, setEdges, journeyLayout])

  // Handle AI import from transcript
  const handleImportFromTranscript = useCallback(async () => {
    try {
      setImportTranscriptError(null)
      setImportTranscriptLoading(true)

      // Validate transcript
      if (!importTranscriptText.trim()) {
        setImportTranscriptError('Please paste a transcript to import.')
        setImportTranscriptLoading(false)
        return
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
        userRoleNames
      )

      // Validate the response
      if (!journeyData.nodes || !Array.isArray(journeyData.nodes)) {
        setImportTranscriptError('AI did not return valid journey data. Please try again or adjust your transcript.')
        setImportTranscriptLoading(false)
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

      // --- STEP 3: Convert to React Flow nodes with positions and user roles ---
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
          id: node.id,
          type: node.type || 'process',
          position: node.position,
          data: {
            ...node.data,
            userRole: userRoleObj,
            journeyLayout: importTranscriptLayout
          },
          selectable: true,
        }
      })

      // Set journey metadata and layout
      setJourneyName(journeyData.name || 'Imported from Transcript')
      setJourneyDescription(journeyData.description || '')
      setJourneyLayout(importTranscriptLayout)
      
      // Set nodes and edges
      setNodes(importedNodes)
      setEdges(journeyData.edges || [])
      
      // Close modal and reset state
      setShowImportTranscriptModal(false)
      setImportTranscriptText('')
      setImportTranscriptError(null)
      setImportTranscriptLoading(false)

      // Show success message
      alert(`Successfully imported journey from transcript with ${importedNodes.length} nodes in ${importTranscriptLayout} layout!`)
    } catch (error) {
      console.error('Error importing from transcript:', error)
      setImportTranscriptError(
        error instanceof Error 
          ? `Failed to convert transcript: ${error.message}` 
          : 'Failed to convert transcript. Please try again.'
      )
      setImportTranscriptLoading(false)
    }
  }, [importTranscriptText, importTranscriptLayout, userRoles, setNodes, setEdges])

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

      // Call OpenAI API to edit the journey
      const updatedJourney = await editJourneyWithAI(currentJourney, editInstruction)

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
    }
  }, [editInstruction, journeyName, journeyDescription, nodes, edges, userRoles, setNodes, setEdges])

  // Configure specific node (from button click)
  const configureNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setConfiguringNode(node)
      setIsAddingNewNode(false)
      const existingBulletPoints = (node.data?.bulletPoints as string[]) || []
      
      // Debug: Log node data
      console.log('Configuring node:', node)
      console.log('Node data variant:', node.data?.variant)
      console.log('Node data thirdPartyName:', node.data?.thirdPartyName)
      
      // Handle variant - preserve the exact value including empty string
      const nodeVariant = node.data?.variant as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
      const resolvedVariant = nodeVariant !== undefined && nodeVariant !== null ? nodeVariant : 'Legl'
      
      setConfigForm({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        userRole: (node.data?.userRole as UserRole | null) || null,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: (node.data?.notifications as Notification[]) || [],
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
      setShowConfigModal(true)
    }
  }, [nodes])

  // Save node configuration
  const saveNodeConfiguration = useCallback(async () => {
    if (isAddingNewNode) {
      // Create a new node
      const newNode: Node = {
        id: `${Date.now()}`,
        type: configForm.type,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        selectable: true,
        ...(configForm.swimLane ? { parentId: configForm.swimLane } : {}),
        data: {
          ...configForm,
          journeyLayout
        },
      }
      
      setNodes((nds) => [...nds, newNode])
      
      // Save to database if journey already exists
      if (currentJourneyId) {
        try {
          const updatedNodes = [...nodes, newNode]
          await updateUserJourney(currentJourneyId, {
            flow_data: { nodes: updatedNodes, edges }
          })
        } catch (error) {
          console.error('Error saving new node:', error)
        }
      }
    } else {
      // Update existing node
      if (!configuringNode) return

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === configuringNode.id) {
            const updatedNode: any = {
              ...node,
              type: configForm.type,
              data: {
                ...node.data,
                ...configForm,
                journeyLayout
              }
            }
            
            // Handle parentId based on swimLane
            if (configForm.swimLane) {
              updatedNode.parentId = configForm.swimLane
            } else {
              // Remove parentId if swimLane is null
              delete updatedNode.parentId
            }
            
            return updatedNode
          }
          return node
        })
      )

      // Save to database if journey already exists
      if (currentJourneyId) {
        try {
          const updatedNodes = nodes.map((node) => {
            if (node.id === configuringNode.id) {
              const updatedNode: any = {
                ...node,
                type: configForm.type,
                data: {
                  ...node.data,
                  ...configForm,
                  journeyLayout
                }
              }
              
              // Handle parentId based on swimLane
              if (configForm.swimLane) {
                updatedNode.parentId = configForm.swimLane
              } else {
                // Remove parentId if swimLane is null
                delete updatedNode.parentId
              }
              
              return updatedNode
            }
            return node
          })
          
          await updateUserJourney(currentJourneyId, {
            flow_data: { nodes: updatedNodes, edges }
          })
        } catch (error) {
          console.error('Error saving node configuration:', error)
        }
      }
    }

    setShowConfigModal(false)
    setConfiguringNode(null)
    setIsAddingNewNode(false)
  }, [isAddingNewNode, configuringNode, configForm, setNodes, currentJourneyId, nodes, edges])

  // Add custom property to node
  const addCustomProperty = useCallback(() => {
    const key = prompt('Property name:')
    const value = prompt('Property value:')
    if (key && value) {
      setConfigForm(prev => ({
        ...prev,
        customProperties: { ...prev.customProperties, [key]: value }
      }))
    }
  }, [])

  // Remove custom property from node
  const removeCustomProperty = useCallback((key: string) => {
    setConfigForm(prev => {
      const { [key]: _, ...rest } = prev.customProperties
      return { ...prev, customProperties: rest }
    })
  }, [])

  // Add bullet point to node
  const addBulletPoint = useCallback(() => {
    setConfigForm(prev => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, '']
    }))
  }, [])

  // Update bullet point
  const updateBulletPoint = useCallback((index: number, newText: string) => {
    setConfigForm(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.map((bp, i) => i === index ? newText : bp)
    }))
  }, [])

  // Remove bullet point from node
  const removeBulletPoint = useCallback((index: number) => {
    setConfigForm(prev => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, i) => i !== index)
    }))
  }, [])

  // Handle Tab key in bullet point inputs
  const handleBulletPointKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string) => {
    if (e.key === 'Tab' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      // Add new bullet point
      setConfigForm(prev => ({
        ...prev,
        bulletPoints: [...prev.bulletPoints, '']
      }))
      // Focus the new input after it's rendered
      setTimeout(() => {
        const newIndex = index + 1
        if (bulletInputRefs.current[newIndex]) {
          bulletInputRefs.current[newIndex]?.focus()
        }
      }, 0)
    }
  }, [])

  // Add notification to node
  const addNotification = useCallback(() => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'info',
      message: ''
    }
    setConfigForm(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification]
    }))
  }, [])

  // Update notification
  const updateNotification = useCallback((id: string, field: 'type' | 'message', value: string) => {
    setConfigForm(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === id ? { ...notif, [field]: value } : notif
      )
    }))
  }, [])

  // Remove notification from node
  const removeNotification = useCallback((id: string) => {
    setConfigForm(prev => ({
      ...prev,
      notifications: prev.notifications.filter(notif => notif.id !== id)
    }))
  }, [])

  // Delete node with confirmation
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodeToDelete(nodeId)
    setShowDeleteConfirm(true)
  }, [])

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

  // Duplicate node
  const duplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find((node) => node.id === nodeId)
    if (!nodeToDuplicate) return

    const newNodeId = `node-${Date.now()}`
    const newNode = {
      ...nodeToDuplicate,
      id: newNodeId,
      type: 'process', // Always set to Middle/process type
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        type: 'process' // Always set to Middle/process type
      }
    }

    setNodes((nds) => [...nds, newNode])
  }, [nodes, setNodes])

  // Add new highlight region
  const addHighlightRegion = useCallback(() => {
    const newRegionId = `region-${Date.now()}`
    const newRegion: Node = {
      id: newRegionId,
      type: 'highlightRegion',
      position: { x: 100, y: 100 },
      style: {
        width: 600,
        height: 400,
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
  }, [setNodes])

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

  // Handle node drag stop - auto-assign to regions
  const handleNodeDragStop = useCallback(
    (_event: any, _node: Node) => {
      // Disabled automatic swim lane assignment on drag
      // Users should manually assign nodes to swim lanes via the Edit Node modal
      // This prevents unwanted position changes when dragging nodes
      
      // Future: Could add optional auto-assignment with a modifier key (e.g., hold Shift to auto-assign)
    },
    []
  )

  // Tidy up node positions with proper spacing
  // Horizontal layout tidy up function
  const tidyUpHorizontal = useCallback(() => {
    if (nodes.length === 0) return

    const HORIZONTAL_SPACING = 40 // 40px between nodes
    const NODE_WIDTH = 320
    const REGION_PADDING = 40 // 40px gap between region boundary and nodes inside

    // Separate regions from regular nodes
    const regions = nodes.filter(n => n.type === 'highlightRegion')
    const regularNodes = nodes.filter(n => n.type !== 'highlightRegion')

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

    // BFS to assign horizontal positions
    const horizontalOrder = new Map<string, number>()
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
          }
          
          queue.push(childId)
        }
      })
    }

    // Convert horizontal order to actual x positions
    const updatedNodes = regularNodes.map(node => {
      const position = horizontalOrder.get(node.id) || 0
      const xPosition = 100 + (position * (NODE_WIDTH + HORIZONTAL_SPACING))
      
      return {
        ...node,
        position: {
          x: xPosition,
          y: node.position.y // Keep existing y position
        }
      }
    })

    // Adjust nodes inside regions to have proper padding
    const finalNodes = [...regions, ...updatedNodes].map(node => {
      // Skip if it's a region itself
      if (node.type === 'highlightRegion') {
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
        flow_data: { nodes: finalNodes, edges }
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

    // Build adjacency map for graph traversal
    const adjacencyMap = new Map<string, string[]>()
    const incomingEdges = new Map<string, number>()
    const parentMap = new Map<string, string[]>() // Track parents for each node

    nodes.forEach(node => {
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
    
    nodes.forEach(node => {
      const parents = parentMap.get(node.id) || []
      const children = adjacencyMap.get(node.id) || []
      nodeParentCount.set(node.id, parents.length)
      nodeChildCount.set(node.id, children.length)
    })
    
    // Classify nodes by layout type
    nodes.forEach(node => {
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
    
    // STEP 1: Position all non-branch-child nodes first (including convergent nodes)
    console.log('=== STEP 1: Positioning Parent Nodes ===')
    
    // First, align convergent nodes with their branch node (or divergent parent if applicable)
    console.log('=== Aligning Convergent Nodes ===')
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
          
          // Find branch ancestor from first parent
          const branchAncestor = findBranchAncestor(parents[0])
          
          if (branchAncestor && branchingXPositions.has(branchAncestor)) {
            const branchX = branchingXPositions.get(branchAncestor)!
            branchingXPositions.set(node.id, branchX)
            const branchLabel = nodes.find(n => n.id === branchAncestor)
            console.log(`  Convergent node ${nodeLabel}: aligned with branch node ${(branchLabel?.data as any)?.label || branchAncestor} at x=${branchX}`)
          }
        }
      }
    })
    
    // STEP 2: Now position branch nodes and their children
    // Process level by level to ensure parents are positioned before children
    console.log('=== STEP 2: Positioning Branch Nodes and Children ===')
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
    
    // Default: All nodes inherit their parent's X position
    // Only branch children, convergent nodes, and divergent nodes get different positions
    console.log('=== Setting Default X Positions (inherit from parent) ===')
    
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

    // Apply calculated positions to nodes
    const updatedNodes = nodes.map(node => {
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
          flow_data: { nodes: updatedNodes, edges }
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
    start: (props: any) => {
      console.log('Node props:', props)
      return (
        <UserJourneyNode 
          {...props} 
          showHandles={true}
          thirdParties={thirdParties}
          onEdit={() => {
            console.log('Edit clicked for node:', props.id)
            configureNode(props.id)
          }}
          onDuplicate={() => {
            console.log('Duplicate clicked for node:', props.id)
            duplicateNode(props.id)
          }}
          onDelete={() => {
            console.log('Delete clicked for node:', props.id)
            handleDeleteNode(props.id)
          }}
        />
      )
    },
    process: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    decision: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    end: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    highlightRegion: (props: any) => (
      <HighlightRegionNode
        {...props}
        onEdit={() => configureRegion(props.id)}
      />
    ),
  }), [configureNode, duplicateNode, handleDeleteNode, thirdParties, configureRegion])

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading journey...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/user-journeys')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to User Journeys
          </Button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
          {selectedProjectId && (
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen size={14} className="text-gray-400" />
                <p className="text-sm text-gray-500">
                  {projects.find(p => p.id === selectedProjectId)?.name || 'Unknown'}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-1">
              
              <h2 className="text-2xl font-bold text-gray-900">{journeyName}</h2>
              <button
                onClick={() => setShowNameEditModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Edit journey name and description"
              >
                <Edit size={18} />
              </button>
            </div>
            {journeyDescription && (
              <p className="text-gray-600">{journeyDescription}</p>
            )}
            
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowImportJsonModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Upload size={16} />
            Import JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportTranscriptModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles size={16} />
            Import Transcript
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportImageModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <ImageIcon size={16} />
            Import from Image
          </Button>
          <Button
            variant="outline"
            onClick={exportJourney}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Download size={16} />
            Export
          </Button>
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
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 bg-white rounded-lg border overflow-hidden" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance
          }}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={true}
          nodesConnectable={true}
          nodesFocusable={true}
          elementsSelectable={true}
          selectNodesOnDrag={true}
          multiSelectionKeyCode="Shift"
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
                <Sparkles size={16} />
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

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false)
            setIsAddingNewNode(false)
          }}
          title={isAddingNewNode ? "Add Node" : "Edit Node"}
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfigModal(false)
                  setIsAddingNewNode(false)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveNodeConfiguration}
              >
                Save
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={configForm.label}
                onChange={(e) => setConfigForm(prev => ({ ...prev, label: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder="Enter node description..."
              />
            </div>

            {/* Node Layout Classification (read-only, for debugging) */}
            {configuringNode && (configuringNode.data as any)?.nodeLayout && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Layout (Debug)
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 text-sm">
                  {(configuringNode.data as any).nodeLayout}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This classification is automatically determined by the node's connections after running "Tidy up"
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Type
              </label>
              <SegmentedControl
                options={[
                  { value: 'start', label: 'Start' },
                  { value: 'process', label: 'Middle' },
                  { value: 'end', label: 'End' }
                ]}
                value={configForm.type}
                onChange={(value) => setConfigForm(prev => ({ ...prev, type: value as 'start' | 'process' | 'decision' | 'end' }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bullet Points
              </label>
              <div className="space-y-2">
                {configForm.bulletPoints.map((bullet, index) => (
                  <div key={index} className="flex items-start gap-2 group">
                    <span className="text-gray-500 mt-2.5">•</span>
                    <input
                      ref={(el) => bulletInputRefs.current[index] = el}
                      type="text"
                      value={bullet}
                      onChange={(e) => updateBulletPoint(index, e.target.value)}
                      onKeyDown={(e) => handleBulletPointKeyDown(e, index, bullet)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter bullet point text"
                    />
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => removeBulletPoint(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="small"
                  onClick={addBulletPoint}
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Add Bullet Point
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notifications
              </label>
              <div className="space-y-3">
                {configForm.notifications.map((notification) => (
                  <div key={notification.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    {/* Notification Type Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'pain-point', label: 'Red (pain point)', color: 'bg-red-100 border-red-300 text-red-800' },
                          { value: 'warning', label: 'Yellow (Warning)', color: 'bg-yellow-100 border-yellow-300 text-yellow-900' },
                          { value: 'info', label: 'Grey (Info)', color: 'bg-gray-100 border-gray-300 text-gray-700' },
                          { value: 'positive', label: 'Green (Positive)', color: 'bg-green-100 border-green-300 text-green-800' },
                        ].map((typeOption) => (
                          <button
                            key={typeOption.value}
                            type="button"
                            onClick={() => updateNotification(notification.id, 'type', typeOption.value)}
                            className={`
                              ${typeOption.color}
                              border-2 rounded px-2 py-1.5 text-xs font-medium
                              transition-all
                              ${notification.type === typeOption.value 
                                ? 'ring-2 ring-blue-500 ring-offset-1' 
                                : 'opacity-60 hover:opacity-100'
                              }
                            `}
                          >
                            {typeOption.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notification Message */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Message
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={notification.message}
                          onChange={(e) => updateNotification(notification.id, 'message', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Enter notification message"
                        />
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => removeNotification(notification.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="small"
                  onClick={addNotification}
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Add Notification
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={configForm.variant}
                  onChange={(e) => {
                    const newVariant = e.target.value as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | ''
                    setConfigForm(prev => ({ 
                      ...prev, 
                      variant: newVariant,
                      // Clear third party name if not selecting Third party
                      thirdPartyName: newVariant === 'Third party' ? prev.thirdPartyName : ''
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="CMS">CMS</option>
                  <option value="Legl">Legl</option>
                  <option value="End client">End client</option>
                  <option value="Back end">Back end</option>
                  <option value="Third party">Third party</option>
                </select>
              </div>

              {/* Third Party Name Input - only shown when variant is Third party */}
              {configForm.variant === 'Third party' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Third Party Name *
                  </label>
                  <input
                    type="text"
                    value={configForm.thirdPartyName}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, thirdPartyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Stripe, Auth0, Mailchimp"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <select
                  value={configForm.userRole?.id || ''}
                  onChange={(e) => {
                    const role = userRoles.find(r => r.id === e.target.value)
                    setConfigForm(prev => ({ ...prev, userRole: role || null }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {userRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Swim Lane (Region) Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Swim Lane (Region)
                </label>
                <select
                  value={configForm.swimLane || ''}
                  onChange={(e) => {
                    setConfigForm(prev => ({ ...prev, swimLane: e.target.value || null }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (No Region)</option>
                  {nodes.filter(n => n.type === 'highlightRegion').map((region) => (
                    <option key={region.id} value={region.id}>
                      {(region.data as any)?.label || region.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Assign this node to a region. Nodes inside regions will move together with the region.
                </p>
              </div>
            </div>

            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Properties
              </label>
              <div className="space-y-2">
                {Object.entries(configForm.customProperties).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm font-medium">{key}:</span>
                    <span className="text-sm">{String(value)}</span>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => removeCustomProperty(key)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="small"
                  onClick={addCustomProperty}
                >
                  <Plus size={16} className="mr-2" />
                  Add Property
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

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
                Label Text
              </label>
              <input
                type="text"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                placeholder="e.g., 'Yes', 'No', 'Next', 'Cancel'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveEdgeLabel()
                  }
                }}
              />
              <p className="mt-2 text-sm text-gray-500">
                Add a label to describe this connection or transition
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Name Edit Modal */}
      {showNameEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Journey Details
            </h3>
            <div className="space-y-4">
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
                  autoFocus
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
                  Layout
                </label>
                <select
                  value={journeyLayout}
                  onChange={(e) => setJourneyLayout(e.target.value as 'vertical' | 'horizontal')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="vertical">Vertical (Top to Bottom)</option>
                  <option value="horizontal">Horizontal (Left to Right)</option>
                </select>
              </div>
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
                onClick={() => setShowNameEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Save to database if journey already exists
                  if (currentJourneyId && journeyName.trim()) {
                    try {
                      await updateUserJourney(currentJourneyId, {
                        name: journeyName,
                        description: journeyDescription,
                        project_id: selectedProjectId || null
                      })
                      
                      // Save law firm associations
                      await setUserJourneyLawFirms(currentJourneyId, selectedLawFirmIds)
                    } catch (error) {
                      console.error('Error saving journey details:', error)
                    }
                  }
                  setShowNameEditModal(false)
                }}
                disabled={!journeyName.trim()}
              >
                Save Details
              </Button>
            </div>
          </div>
        </div>
      )}

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
      <Modal
        isOpen={showImportTranscriptModal}
        onClose={() => {
          setShowImportTranscriptModal(false)
          setImportTranscriptText('')
          setImportTranscriptError(null)
        }}
        title="Import Journey from Transcript"
        size="lg"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportTranscriptModal(false)
                setImportTranscriptText('')
                setImportTranscriptError(null)
              }}
              disabled={importTranscriptLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFromTranscript}
              disabled={!importTranscriptText.trim() || importTranscriptLoading}
            >
              {importTranscriptLoading ? (
                <>
                  <Sparkles size={16} className="animate-pulse" />
                  Converting...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Import
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
              AI-Powered Transcript Analysis
            </p>
            <p className="text-sm text-blue-700">
              Paste a phone call transcript below. Our AI will automatically extract the user journey, 
              identify steps, roles, and create a complete diagram for you.
            </p>
          </div>

          {/* Layout Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journey Layout
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImportTranscriptLayout('vertical')}
                className={`
                  flex-1 px-4 py-2 rounded-lg border-2 transition-all
                  ${importTranscriptLayout === 'vertical'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                disabled={importTranscriptLoading}
              >
                <div className="text-center">
                  <div className="font-medium">Vertical</div>
                  <div className="text-xs mt-1">Top to bottom flow</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setImportTranscriptLayout('horizontal')}
                className={`
                  flex-1 px-4 py-2 rounded-lg border-2 transition-all
                  ${importTranscriptLayout === 'horizontal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                disabled={importTranscriptLoading}
              >
                <div className="text-center">
                  <div className="font-medium">Horizontal</div>
                  <div className="text-xs mt-1">Left to right flow</div>
                </div>
              </button>
            </div>
          </div>
          
          <div>
            <textarea
              value={importTranscriptText}
              onChange={(e) => {
                setImportTranscriptText(e.target.value)
                setImportTranscriptError(null)
              }}
              placeholder='Paste your transcript here, e.g.:

"The client called to discuss their new property purchase. They mentioned they need to complete ID verification and provide proof of funds. The lawyer explained they would need to upload bank statements from the last 3 months..."'
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={importTranscriptLoading}
            />
          </div>

          {importTranscriptError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{importTranscriptError}</p>
            </div>
          )}

          {importTranscriptLoading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Sparkles size={14} className="animate-pulse" />
                Analyzing transcript with AI... This may take a moment.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit with AI Modal */}
      <Modal
        isOpen={showEditWithAIModal}
        onClose={() => {
          setShowEditWithAIModal(false)
          setEditInstruction('')
          setEditAIError(null)
        }}
        title="Edit Journey with AI"
        size="lg"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditWithAIModal(false)
                setEditInstruction('')
                setEditAIError(null)
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
                  <Sparkles size={16} className="animate-pulse" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
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
                <Sparkles size={14} className="animate-pulse" />
                AI is analyzing your journey and applying changes... This may take a moment.
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
    </div>
  )
}
