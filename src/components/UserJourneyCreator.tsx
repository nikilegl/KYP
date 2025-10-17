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
import { Save, Plus, Download, Upload, ArrowLeft, Edit, FolderOpen, Check } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { ImportJourneyImageModal } from './ImportJourneyImageModal'
import type { UserRole, Project } from '../lib/supabase'
import { getProjects, createUserJourney, updateUserJourney, getUserJourneyById } from '../lib/database'
import type { AnalyzedJourney } from '../lib/services/aiImageAnalysisService'

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
  const [journeyName, setJourneyName] = useState('User Journey 01')
  const [journeyDescription, setJourneyDescription] = useState('')
  const [showNameEditModal, setShowNameEditModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configuringNode, setConfiguringNode] = useState<Node | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)
  const [configForm, setConfigForm] = useState({
    label: '',
    type: 'process' as 'start' | 'process' | 'decision' | 'end',
    variant: 'Legl' as 'CMS' | 'Legl' | 'End client' | 'Back end' | '',
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
  
  // Ref to track bullet point input elements
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // History for undo functionality
  const [history, setHistory] = useState<Node[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoing = useRef(false)

  // Load projects and journey on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)
      
      // Check if there's an ID in the URL query params
      const urlJourneyId = searchParams.get('id')
      const loadJourneyId = urlJourneyId || journeyId
      
      if (loadJourneyId) {
        // Load existing journey
        const journey = await getUserJourneyById(loadJourneyId)
        if (journey) {
          setCurrentJourneyId(journey.id)
          setJourneyName(journey.name)
          setJourneyDescription(journey.description || '')
          setSelectedProjectId(journey.project_id || '')
          
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
        if (projectId && projectsData.find(p => p.id === projectId)) {
          setSelectedProjectId(projectId)
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

  // Add new node
  const addNode = useCallback((type: 'start' | 'process' | 'decision' | 'end') => {
    const typeLabels = {
      start: 'Start',
      process: 'Middle',
      decision: 'Decision',
      end: 'End'
    }
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      selectable: true,
      data: {
        label: `New ${typeLabels[type]}`,
        type,
        variant: 'Legl'
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  // Smart add node - adds start if no start exists, otherwise adds middle
  const smartAddNode = useCallback(() => {
    const hasStartNode = nodes.some(node => node.type === 'start')
    if (hasStartNode) {
      addNode('process')
    } else {
      addNode('start')
    }
  }, [nodes, addNode])

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
      const journeyData = JSON.parse(importJsonText)
      
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
        
        return {
          id: node.id,
          type: node.type || 'process',
          position: {
            x: node.position.x,
            y: node.position.y
          },
          data: node.data,
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
        setImportJsonError(error.message)
      } else {
        setImportJsonError('Invalid JSON format. Please check your input.')
      }
    }
  }, [importJsonText, setNodes, setEdges])


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

  // Configure specific node (from button click)
  const configureNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setConfiguringNode(node)
      const existingBulletPoints = (node.data?.bulletPoints as string[]) || []
      setConfigForm({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: (node.data?.variant as 'CMS' | 'Legl' | 'End client' | 'Back end' | '') || 'Legl',
        userRole: (node.data?.userRole as UserRole | null) || null,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {}
      })
      setShowConfigModal(true)
    }
  }, [nodes])

  // Save node configuration
  const saveNodeConfiguration = useCallback(async () => {
    if (!configuringNode) return

    // Update nodes in state
    setNodes((nds) =>
      nds.map((node) =>
        node.id === configuringNode.id
          ? {
              ...node,
              type: configForm.type, // Update the node type for React Flow
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

    setShowConfigModal(false)
    setConfiguringNode(null)
  }, [configuringNode, configForm, setNodes, currentJourneyId, nodes, edges])

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
            {selectedProjectId && (
              <div className="flex items-center gap-2 mt-2">
                <FolderOpen size={14} className="text-gray-400" />
                <p className="text-sm text-gray-500">
                  {projects.find(p => p.id === selectedProjectId)?.name || 'Unknown'}
                </p>
              </div>
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
            <Button
              variant="secondary"
              onClick={smartAddNode}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Node
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Edit Node"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfigModal(false)}
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
                  onChange={(e) => setConfigForm(prev => ({ ...prev, variant: e.target.value as 'CMS' | 'Legl' | 'End client' | 'Back end' | '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="CMS">CMS</option>
                  <option value="Legl">Legl</option>
                  <option value="End client">End client</option>
                  <option value="Back end">Back end</option>
                </select>
              </div>

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
    </div>
  )
}
