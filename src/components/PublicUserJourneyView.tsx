import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { UserJourneyNode } from './DesignSystem/components/UserJourneyNode'
import { HighlightRegionNode } from './DesignSystem/components/HighlightRegionNode'
import { CustomEdge } from './DesignSystem/components/CustomEdge'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { getUserJourneyByPublicId } from '../lib/database/services/userJourneyService'
import type { ThirdParty, Platform } from '../lib/supabase'
import { getPlatforms } from '../lib/database'
import { getThirdParties } from '../lib/database/services/thirdPartyService'
import { convertEmojis } from '../utils/emojiConverter'
import { renderMarkdown } from '../utils/markdownRenderer'

// Initial empty arrays with proper types
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

export function PublicUserJourneyView() {
  const { publicId } = useParams<{ publicId: string }>()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [journeyName, setJourneyName] = useState('')
  const [journeyDescription, setJourneyDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  useEffect(() => {
    const loadJourney = async () => {
      try {
        if (!publicId) {
          setError('No journey ID provided')
          setLoading(false)
          return
        }

        // Fetch journey by secure public_id
        const journey = await getUserJourneyByPublicId(publicId)

        if (!journey) {
          setError('Journey not found')
          setLoading(false)
          return
        }

        // Journeys can be viewed via public link regardless of folder status
        setJourneyName(journey.name)
        setJourneyDescription(journey.description || '')

        if (journey.flow_data) {
          // Set nodes as non-selectable and non-draggable for public view
          const publicNodes = journey.flow_data.nodes.map(node => ({
            ...node,
            selectable: false,
            draggable: false,
          }))
          setNodes(publicNodes)
          setEdges(journey.flow_data.edges)
        }

        // Load platforms and third parties for node rendering
        const platformsData = await getPlatforms()
        setPlatforms(platformsData)

        // Try to load third parties (may fail without auth, but that's ok)
        try {
          const thirdPartiesData = await getThirdParties('')
          setThirdParties(thirdPartiesData)
        } catch (error) {
          console.log('Could not load third parties (expected for public view)')
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading public journey:', error)
        setError('Failed to load journey')
        setLoading(false)
      }
    }

    loadJourney()
  }, [publicId, setNodes, setEdges])

  // Define node types for read-only view
  const nodeTypes: NodeTypes = React.useMemo(() => ({
    start: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        connectedEdges={edges}
        onEdit={undefined} // No editing in public view
      />
    ),
    process: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        connectedEdges={edges}
        onEdit={undefined}
      />
    ),
    decision: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        connectedEdges={edges}
        onEdit={undefined}
      />
    ),
    end: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={true}
        thirdParties={thirdParties}
        platforms={platforms}
        connectedEdges={edges}
        onEdit={undefined}
      />
    ),
    label: (props: any) => (
      <UserJourneyNode 
        {...props} 
        showHandles={false}
        thirdParties={thirdParties}
        platforms={platforms}
        connectedEdges={edges}
        onEdit={undefined}
      />
    ),
    highlightRegion: (props: any) => (
      <HighlightRegionNode
        {...props}
        onEdit={undefined}
      />
    ),
  }), [thirdParties, platforms, edges])

  // Define edge types for read-only view
  const edgeTypes: EdgeTypes = React.useMemo(() => ({
    default: (props: any) => (
      <CustomEdge
        {...props}
        data={{
          ...props.data,
          onLabelClick: undefined, // No label editing in public view
          disableHover: true, // Disable hover highlighting in public view
        }}
      />
    ),
    custom: (props: any) => (
      <CustomEdge
        {...props}
        data={{
          ...props.data,
          onLabelClick: undefined, // No label editing in public view
          disableHover: true, // Disable hover highlighting in public view
        }}
      />
    ),
  }), [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading journey..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Journey Not Available</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">{convertEmojis(journeyName)}</h1>
        {journeyDescription && (
          <p className="text-sm text-gray-600 mt-1">{renderMarkdown(journeyDescription)}</p>
        )}
      </div>

      {/* Journey Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={4}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={12} 
            size={1}
            color="#9ca3af"
            bgColor="#e5e7eb"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

     
    </div>
  )
}

