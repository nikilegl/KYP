import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from './DesignSystem/components/Button'
import { UserJourneyNode } from './DesignSystem/components/UserJourneyNode'
import { CustomEdge } from './DesignSystem/components/CustomEdge'
import { Save, Plus, Download, Upload, ArrowLeft, Edit } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import type { UserRole, Project } from '../lib/supabase'
import { getProjects, createUserJourney, updateUserJourney, getUserJourneyById } from '../lib/database'

// We need to define nodeTypes inside the component to access the handlers
// This will be moved inside the component


// Initial nodes for the flow
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 25 },
    selectable: false,
    data: {
      label: 'User Starts Journey',
      description: 'User begins their interaction',
      type: 'start',
      variant: 'default'
    },
  },
  {
    id: '2',
    type: 'process',
    position: { x: 100, y: 125 },
    selectable: false,
    data: {
      label: 'Initial Action',
      description: 'User performs first action',
      type: 'process',
      variant: 'default'
    },
  },
  {
    id: '3',
    type: 'decision',
    position: { x: 400, y: 125 },
    selectable: false,
    data: {
      label: 'Decision Point',
      description: 'User makes a choice',
      type: 'decision',
      variant: 'default'
    },
  },
  {
    id: '4',
    type: 'end',
    position: { x: 250, y: 250 },
    selectable: false,
    data: {
      label: 'Journey Complete',
      description: 'User reaches goal',
      type: 'end',
      variant: 'default'
    },
  },
]

// Initial edges for the flow
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', data: {} },
  { id: 'e1-3', source: '1', target: '3', data: {} },
  { id: 'e2-4', source: '2', target: '4', data: {} },
  { id: 'e3-4', source: '3', target: '4', data: {} },
]

interface UserJourneyCreatorProps {
  userRoles?: UserRole[]
  projectId?: string // Optional - if provided, will auto-select that project
  journeyId?: string // Optional - if provided, will load that journey for editing
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
    description: '',
    variant: 'default' as 'default' | 'outlined' | 'filled',
    userRole: null as UserRole | null,
    customProperties: {} as Record<string, unknown>
  })
  const [showEdgeLabelModal, setShowEdgeLabelModal] = useState(false)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [saving, setSaving] = useState(false)
  const [currentJourneyId, setCurrentJourneyId] = useState<string | null>(journeyId || null)
  const [loading, setLoading] = useState(true)

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
            // Ensure nodes are marked as not selectable
            const nodesWithSelection = journey.flow_data.nodes.map(node => ({
              ...node,
              selectable: false
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
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      selectable: false,
      data: {
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: `Description for ${type} step`,
        type,
        variant: 'default'
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  // Save journey
  const saveJourney = useCallback(async () => {
    if (!journeyName.trim()) {
      alert('Please enter a journey name')
      return
    }

    // If using default name, open modal to get custom name
    if (journeyName === 'User Journey 01' && !currentJourneyId) {
      setShowNameEditModal(true)
      return
    }

    setSaving(true)
    try {
      const flowData = { nodes, edges }
      
      if (currentJourneyId) {
        // Update existing journey
        const updated = await updateUserJourney(currentJourneyId, {
          name: journeyName,
          description: journeyDescription,
          flow_data: flowData
        })
        
        if (updated) {
          console.log('Journey updated successfully:', updated)
          alert('Journey updated successfully!')
        } else {
          alert('Failed to update journey')
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
          alert('Journey saved successfully!')
        } else {
          alert('Failed to save journey')
        }
      }
      
      setShowSaveModal(false)
      setShowNameEditModal(false)
    } catch (error) {
      console.error('Error saving journey:', error)
      alert('An error occurred while saving the journey')
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

  // Import journey from JSON
  const importJourney = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const journeyData = JSON.parse(e.target?.result as string)
          setJourneyName(journeyData.name || 'Imported Journey')
          setJourneyDescription(journeyData.description || '')
          // Ensure imported nodes are not selectable
          const importedNodes = (journeyData.nodes || []).map((node: Node) => ({
            ...node,
            selectable: false,
          }))
          setNodes(importedNodes)
          setEdges(journeyData.edges || [])
        } catch (error) {
          console.error('Error importing journey:', error)
          alert('Error importing journey. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }, [setNodes, setEdges])

  // Configure specific node (from button click)
  const configureNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setConfiguringNode(node)
      setConfigForm({
        label: (node.data?.label as string) || '',
        description: (node.data?.description as string) || '',
        variant: (node.data?.variant as 'default' | 'outlined' | 'filled') || 'default',
        userRole: (node.data?.userRole as UserRole | null) || null,
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {}
      })
      setShowConfigModal(true)
    }
  }, [nodes])

  // Save node configuration
  const saveNodeConfiguration = useCallback(() => {
    if (!configuringNode) return

    setNodes((nds) =>
      nds.map((node) =>
        node.id === configuringNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...configForm,
                type: node.data?.type || 'process'
              }
            }
          : node
      )
    )

    setShowConfigModal(false)
    setConfiguringNode(null)
  }, [configuringNode, configForm, setNodes])

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
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    decision: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        onEdit={() => configureNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
    end: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        onEdit={() => configureNode(props.id)}
        onDelete={() => handleDeleteNode(props.id)}
      />
    ),
  }), [configureNode, handleDeleteNode])

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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="space-y-4">
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
        <div className="flex items-start justify-between">
          <div>
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
          <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => document.getElementById('import-file')?.click()}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importJourney}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={exportJourney}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </Button>
          <Button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            Save Journey
          </Button>
          </div>
        </div>
      </div>

      {/* Project Selection */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No project (standalone)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Node Tools */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Add Nodes:</span>
          <Button
            variant="outline"
            size="small"
            onClick={() => addNode('start')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Start
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => addNode('process')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Process
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => addNode('decision')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Decision
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => addNode('end')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            End
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="bg-white rounded-lg border" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={true}
          nodesConnectable={true}
          nodesFocusable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          edgesReconnectable={true}
          edgesFocusable={true}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
        </ReactFlow>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Edit Node"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Label
              </label>
              <input
                type="text"
                value={configForm.label}
                onChange={(e) => setConfigForm(prev => ({ ...prev, label: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={configForm.description}
                onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant
                </label>
                <select
                  value={configForm.variant}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, variant: e.target.value as 'default' | 'outlined' | 'filled' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="default">Default</option>
                  <option value="outlined">Outlined</option>
                  <option value="filled">Filled</option>
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

            <div>
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

            <div className="flex items-center justify-end gap-3 pt-4">
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
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Node</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this node? This action cannot be undone.
            </p>
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
          </div>
        </div>
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
        >
          <div className="space-y-6">
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

            <div className="flex items-center justify-between pt-4 border-t">
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
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowNameEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowNameEditModal(false)}
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
                  Project
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {selectedProjectId 
                    ? projects.find(p => p.id === selectedProjectId)?.name || 'Unknown project'
                    : 'No project (standalone)'}
                </div>
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
    </div>
  )
}
