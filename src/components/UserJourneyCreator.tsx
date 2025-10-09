import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from './DesignSystem/components/Button'
import { Save, Plus, Trash2, Download, Upload, Eye, ArrowLeft } from 'lucide-react'

// Custom node types for user journey steps
const nodeTypes: NodeTypes = {
  start: StartNode,
  process: ProcessNode,
  decision: DecisionNode,
  end: EndNode,
}

// Custom edge types
const edgeTypes: EdgeTypes = {}

// Start Node Component
function StartNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-500">
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#10B981' }}
      />
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-green-500 text-white">
          <span className="text-lg font-bold">S</span>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-green-800">{data.label}</div>
          <div className="text-sm text-green-600">{data.description}</div>
        </div>
      </div>
    </div>
  )
}

// Process Node Component
function ProcessNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-500">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#3B82F6' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#3B82F6' }}
      />
      <div className="flex">
        <div className="rounded w-12 h-12 flex justify-center items-center bg-blue-500 text-white">
          <span className="text-lg font-bold">P</span>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-blue-800">{data.label}</div>
          <div className="text-sm text-blue-600">{data.description}</div>
        </div>
      </div>
    </div>
  )
}

// Decision Node Component
function DecisionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#EAB308' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#EAB308' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#EAB308' }}
      />
      <div className="flex">
        <div className="w-12 h-12 flex justify-center items-center bg-yellow-500 text-white transform rotate-45">
          <span className="text-lg font-bold transform -rotate-45">D</span>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-yellow-800">{data.label}</div>
          <div className="text-sm text-yellow-600">{data.description}</div>
        </div>
      </div>
    </div>
  )
}

// End Node Component
function EndNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-red-100 border-2 border-red-500">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#EF4444' }}
      />
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-red-500 text-white">
          <span className="text-lg font-bold">E</span>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-red-800">{data.label}</div>
          <div className="text-sm text-red-600">{data.description}</div>
        </div>
      </div>
    </div>
  )
}

// Initial nodes for the flow
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 25 },
    data: { 
      label: 'User Starts Journey',
      description: 'User begins their interaction'
    },
  },
  {
    id: '2',
    type: 'process',
    position: { x: 100, y: 125 },
    data: { 
      label: 'Initial Action',
      description: 'User performs first action'
    },
  },
  {
    id: '3',
    type: 'decision',
    position: { x: 400, y: 125 },
    data: { 
      label: 'Decision Point',
      description: 'User makes a choice'
    },
  },
  {
    id: '4',
    type: 'end',
    position: { x: 250, y: 250 },
    data: { 
      label: 'Journey Complete',
      description: 'User reaches goal'
    },
  },
]

// Initial edges for the flow
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
]

interface UserJourneyCreatorProps {
  // Props will be added as needed
}

export function UserJourneyCreator({}: UserJourneyCreatorProps) {
  const navigate = useNavigate()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [journeyName, setJourneyName] = useState('New User Journey')
  const [journeyDescription, setJourneyDescription] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Validate connections (optional - can be enhanced with more logic)
  const isValidConnection = useCallback((connection: Connection) => {
    // Basic validation - you can add more sophisticated logic here
    return connection.source !== connection.target
  }, [])

  // Add new node
  const addNode = useCallback((type: 'start' | 'process' | 'decision' | 'end') => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: `Description for ${type} step`
      },
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  // Delete selected nodes
  const deleteSelectedNodes = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected))
    setEdges((eds) => eds.filter((edge) => !edge.selected))
  }, [setNodes, setEdges])

  // Save journey
  const saveJourney = useCallback(() => {
    const journeyData = {
      name: journeyName,
      description: journeyDescription,
      nodes,
      edges,
      createdAt: new Date().toISOString(),
    }
    console.log('Saving journey:', journeyData)
    setShowSaveModal(false)
    // TODO: Implement actual save functionality
  }, [journeyName, journeyDescription, nodes, edges])

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
          setNodes(journeyData.nodes || [])
          setEdges(journeyData.edges || [])
        } catch (error) {
          console.error('Error importing journey:', error)
          alert('Error importing journey. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }, [setNodes, setEdges])

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journey Creator</h2>
            <p className="text-gray-600">Design and visualize user journeys with an interactive flow diagram</p>
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

      {/* Journey Details */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journey Name
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
            <input
              type="text"
              value={journeyDescription}
              onChange={(e) => setJourneyDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter journey description"
            />
          </div>
        </div>
      </div>

      {/* Node Tools */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Add Nodes:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('start')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('process')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Process
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('decision')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Decision
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode('end')}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            End
          </Button>
          <div className="ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelectedNodes}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 size={16} />
              Delete Selected
            </Button>
          </div>
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
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Panel position="top-right">
            <div className="bg-white p-2 rounded shadow-lg">
              <div className="text-xs text-gray-500">
                <div>• Drag nodes to move them</div>
                <div>• Click and drag from handle to handle to connect</div>
                <div>• Select nodes and press Delete to remove</div>
                <div>• Use mouse wheel to zoom</div>
                <div>• Green circles = Start nodes (output only)</div>
                <div>• Blue rectangles = Process nodes (input/output)</div>
                <div>• Yellow diamonds = Decision nodes (multiple outputs)</div>
                <div>• Red circles = End nodes (input only)</div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save User Journey</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journey Name
                </label>
                <input
                  type="text"
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveJourney}
              >
                Save Journey
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
