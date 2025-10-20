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
import { CustomEdge } from './DesignSystem/components/CustomEdge'
import { SegmentedControl } from './DesignSystem/components/SegmentedControl'
import { Save, Plus, Download, Upload, ArrowLeft, Edit, FolderOpen, Check, Sparkles } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { ImportJourneyImageModal } from './ImportJourneyImageModal'
import type { UserRole, Project, LawFirm } from '../lib/supabase'
import { getProjects, createUserJourney, updateUserJourney, getUserJourneyById } from '../lib/database'
import { getLawFirms } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import type { AnalyzedJourney } from '../lib/services/aiImageAnalysisService'
import { convertTranscriptToJourney, editJourneyWithAI } from '../lib/aiService'
import { TRANSCRIPT_TO_JOURNEY_PROMPT } from '../lib/prompts/transcript-to-journey-prompt'

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

export function UserJourneyCreator({ userRoles = [], projectId, journeyId }: UserJourneyCreatorProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstanceRef = useRef<any>(null)
  const [journeyName, setJourneyName] = useState('User Journey 01')
  const [journeyDescription, setJourneyDescription] = useState('')
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
    customProperties: {} as Record<string, unknown>
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
  const [showEditWithAIModal, setShowEditWithAIModal] = useState(false)
  const [editInstruction, setEditInstruction] = useState('')
  const [editAIError, setEditAIError] = useState<string | null>(null)
  const [editAILoading, setEditAILoading] = useState(false)
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [selectedLawFirmIds, setSelectedLawFirmIds] = useState<string[]>([])
  const [lawFirmSearchQuery, setLawFirmSearchQuery] = useState('')
  
  // Ref to track bullet point input elements
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // History for undo functionality
  const [history, setHistory] = useState<Node[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoing = useRef(false)

  // Track selected nodes for copy/paste and edge highlighting
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([])
  const [copiedEdges, setCopiedEdges] = useState<Edge[]>([])

  // Load projects and journey on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)
      
      // Load all law firms
      const lawFirmsData = await getLawFirms()
      setLawFirms(lawFirmsData)
      
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
        // Check URL params first, then props, then default to first project
        const initialProjectId = urlProjectId || projectId
        if (initialProjectId && projectsData.find(p => p.id === initialProjectId)) {
          setSelectedProjectId(initialProjectId)
        } else if (projectsData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectsData[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
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
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo])

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
      // Try to read from clipboard first
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
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      if (isModifierPressed) {
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault()
          copySelectedNodes()
        } else if (event.key === 'v' || event.key === 'V') {
          event.preventDefault()
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
      customProperties: {}
    })
    
    setIsAddingNewNode(true)
    setConfiguringNode(null)
    setShowConfigModal(true)
  }, [nodes])

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
      const flowData = { nodes, edges }
      
      if (currentJourneyId) {
        // Update existing journey
        const updated = await updateUserJourney(currentJourneyId, {
          name: journeyName,
          description: journeyDescription,
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
          selectedProjectId || null
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
  }, [journeyName, journeyDescription, nodes, edges, selectedProjectId, currentJourneyId])

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

      // Convert analyzed nodes to React Flow nodes
      const flowNodes: Node[] = analyzedJourney.nodes.map((node) => {
        // Find matching user role if specified
        let matchedUserRole: UserRole | null = null
        if (node.userRole) {
          matchedUserRole = userRoles.find(role => 
            role.name.toLowerCase().includes(node.userRole!.toLowerCase()) ||
            node.userRole!.toLowerCase().includes(role.name.toLowerCase())
          ) || null
        }

        return {
          id: node.id,
          type: node.type,
          position: node.position,
          selectable: true,
          data: {
            label: node.label,
            type: node.type,
            userRole: matchedUserRole,
            variant: node.platform || 'Legl',
            bulletPoints: node.bulletPoints || [],
            customProperties: {}
          }
        }
      })

      // Convert analyzed edges to React Flow edges
      const flowEdges: Edge[] = analyzedJourney.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        data: {
          label: edge.label || ''
        }
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)

      // Close the modal
      setShowImportImageModal(false)

      // Show success message
      alert(`Successfully imported journey with ${flowNodes.length} nodes and ${flowEdges.length} connections!`)
    } catch (error) {
      console.error('Error processing imported journey:', error)
      alert('Error processing the imported journey. Please try again.')
    }
  }, [userRoles, setNodes, setEdges])

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

      // Call OpenAI API to convert transcript to journey JSON
      const journeyData = await convertTranscriptToJourney(
        importTranscriptText,
        TRANSCRIPT_TO_JOURNEY_PROMPT
      )

      // Validate the response
      if (!journeyData.nodes || !Array.isArray(journeyData.nodes)) {
        setImportTranscriptError('AI did not return valid journey data. Please try again or adjust your transcript.')
        setImportTranscriptLoading(false)
        return
      }

      // Convert the AI-generated nodes to React Flow nodes
      const importedNodes = journeyData.nodes.map((node: any) => {
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

      // Set journey metadata
      setJourneyName(journeyData.name || 'Imported from Transcript')
      setJourneyDescription(journeyData.description || '')
      
      // Set nodes and edges
      setNodes(importedNodes)
      setEdges(journeyData.edges || [])
      
      // Close modal and reset state
      setShowImportTranscriptModal(false)
      setImportTranscriptText('')
      setImportTranscriptError(null)
      setImportTranscriptLoading(false)

      // Show success message
      alert(`Successfully imported journey from transcript with ${importedNodes.length} nodes!`)
    } catch (error) {
      console.error('Error importing from transcript:', error)
      setImportTranscriptError(
        error instanceof Error 
          ? `Failed to convert transcript: ${error.message}` 
          : 'Failed to convert transcript. Please try again.'
      )
      setImportTranscriptLoading(false)
    }
  }, [importTranscriptText, userRoles, setNodes, setEdges])

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

      // Prepare current journey data for AI
      const currentJourney = {
        name: journeyName,
        description: journeyDescription,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            // Convert userRole object to string for AI
            userRole: node.data?.userRole ? (node.data.userRole as any).name : null
          }
        })),
        edges: edges
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
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {}
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
        data: {
          ...configForm
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
        nds.map((node) =>
          node.id === configuringNode.id
            ? {
                ...node,
                type: configForm.type,
                data: {
                  ...node.data,
                  ...configForm
                }
              }
            : node
        )
      )

      // Save to database if journey already exists
      if (currentJourneyId) {
        try {
          const updatedNodes = nodes.map((node) =>
            node.id === configuringNode.id
              ? {
                  ...node,
                  type: configForm.type,
                  data: {
                    ...node.data,
                    ...configForm
                  }
                }
              : node
          )
          
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

  // Tidy up node positions with proper spacing
  const tidyUpNodes = useCallback(() => {
    if (nodes.length === 0) return

    // Use requestAnimationFrame to ensure DOM has been updated
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
          levels.set(childId, level + 1)
          horizontalPositions.set(childId, branch)
          queue.push({ nodeId: childId, level: level + 1, branch })
        }
      } else if (children.length > 1) {
        // Multiple children - create branches
        children.forEach((childId, index) => {
          if (!visited.has(childId)) {
            const childBranch = branch + index
            levels.set(childId, level + 1)
            horizontalPositions.set(childId, childBranch)
            queue.push({ nodeId: childId, level: level + 1, branch: childBranch })
          }
        })
      }
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
    
    // Apply branching layout: position children relative to branch node
    // Process level by level to ensure parents are positioned before children
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
          
          // Branch node should align with its parent - get parent's X position
          let branchNodeX = 288 // Default center position
          if (parentCount === 1) {
            const parents = parentMap.get(nodeId) || []
            const parentId = parents[0]
            // Parent should already have a position since we're processing level by level
            branchNodeX = branchingXPositions.has(parentId) 
              ? branchingXPositions.get(parentId)!
              : getNodeXPosition(parentId)
            const parentLabel = nodes.find(n => n.id === parentId)
            console.log(`  Branch node ${nodeLabel}: aligning with parent ${(parentLabel?.data as any)?.label || parentId} at x=${branchNodeX}`)
          } else if (parentCount === 0) {
            // Root node - use default
            console.log(`  Branch node ${nodeLabel}: root node, using default x=${branchNodeX}`)
          }
          
          branchingXPositions.set(nodeId, branchNodeX)
          
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
            console.log(`  Branch child ${(childLabel?.data as any)?.label || childId}: positioned at x=${childX} (offset ${offsetIndex * 384})`)
          })
        }
      })
    }
    
    // Align convergent nodes with their branch node (unless divergent is involved)
    console.log('=== Aligning Convergent Nodes ===')
    nodes.forEach(node => {
      const parentCount = nodeParentCount.get(node.id) || 0
      
      // If this is a convergent node (2+ parents)
      if (parentCount >= 2) {
        const parents = parentMap.get(node.id) || []
        const nodeLabel = (node.data as any)?.label || node.id
        
        // Check if any parent is divergent
        const hasDivergentParent = parents.some(parentId => {
          const layout = nodeLayout.get(parentId)
          return layout === 'Divergent node'
        })
        
        if (!hasDivergentParent) {
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
        } else {
          console.log(`  Convergent node ${nodeLabel}: has divergent parent, skipping alignment`)
        }
      }
    })
    
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

    // Calculate Y positions for each level, accounting for labeled edges
    const yPositionsByNode = new Map<string, number>()
    const maxLevels = Math.max(...Array.from(levels.values()), 0)
    
    let cumulativeY = 100 // Starting Y position
    
    for (let level = 0; level <= maxLevels; level++) {
      const nodesAtLevel = nodesByLevel.get(level) || []
      
      if (nodesAtLevel.length === 0) continue
      
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
      
      // If this is a divergent node, add 180px offset to the right
      if (layout === 'Divergent node') {
        xPosition += 180
        console.log(`Divergent node ${(node.data as any)?.label || node.id}: adding 180px offset (x: ${xPosition - 180} -> ${xPosition})`)
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
  }, [nodes, edges, setNodes, currentJourneyId])

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
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    decision: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    end: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        onEdit={() => configureNode(props.id)}
        onDuplicate={() => duplicateNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
  }), [configureNode, duplicateNode, handleDeleteNode])

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
          {/* <Button
            variant="outline"
            onClick={() => setShowImportImageModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Image size={16} />
            Import from Image
          </Button> */}
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
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      No law firms found
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
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      No law firms found
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
              placeholder='Examples:
• "Replace Amicus with ThirdFort for all third parties"
• "Add a step for ID verification after the onboarding"
• "Change all Fee Earner roles to Admin"
• "Remove the MLRO escalation branch"
• "Rename all steps mentioning CMS to use the word System instead"'
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={editAILoading}
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Current journey:</strong> {nodes.length} nodes, {edges.length} edges
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
    </div>
  )
}
