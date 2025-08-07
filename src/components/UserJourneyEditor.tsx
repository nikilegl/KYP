import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { UserJourneyHeader } from './UserJourneyEditor/UserJourneyHeader'
import { EditJourneyModal } from './UserJourneyEditor/EditJourneyModal'
import { NodeModal } from './UserJourneyEditor/NodeModal'
import { NodeVisualization } from './UserJourneyEditor/NodeVisualization'
import { 
  getUserJourneyNodes, 
  createUserJourneyNode, 
  updateUserJourneyNode, 
  deleteUserJourneyNode,
  getNodeAnswers,
  updateUserJourney,
  getUserJourneyStakeholders
} from '../lib/database'
import type { UserJourney, UserJourneyNode, Stakeholder, UserRole, LawFirm } from '../lib/supabase'

interface UserJourneyEditorProps {
  journey: UserJourney
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  onBack: () => void
}

interface NodeWithAnswers extends UserJourneyNode {
  answers?: string[]
}

export function UserJourneyEditor({ 
  journey, 
  assignedStakeholders, 
  userRoles, 
  lawFirms, 
  onBack 
}: UserJourneyEditorProps) {
  const [nodes, setNodes] = useState<NodeWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [showNodeForm, setShowNodeForm] = useState(false)
  const [editingNode, setEditingNode] = useState<NodeWithAnswers | null>(null)
  const [showEditJourneyForm, setShowEditJourneyForm] = useState(false)
  const [editingJourney, setEditingJourney] = useState({
    name: journey.name,
    stakeholderIds: [] as string[]
  })
  const [newNode, setNewNode] = useState({
    type: 'task' as 'task' | 'question',
    description: '',
    parentNodeId: '',
    parentAnswer: '',
    painPoint: '',
    answers: ['']
  })

  useEffect(() => {
    loadNodes()
    loadJourneyStakeholders()
  }, [journey.id])

  const loadJourneyStakeholders = async () => {
    try {
      const stakeholderIds = await getUserJourneyStakeholders(journey.id)
      setEditingJourney(prev => ({ ...prev, stakeholderIds }))
    } catch (error) {
      console.error('Error loading journey stakeholders:', error)
    }
  }

  const loadNodes = async () => {
    try {
      setLoading(true)
      const journeyNodes = await getUserJourneyNodes(journey.id)
      
      // Load answers for each question node
      const nodesWithAnswers = await Promise.all(
        journeyNodes.map(async (node) => {
          if (node.type === 'question') {
            const answers = await getNodeAnswers(node.id)
            return { ...node, answers }
          }
          return node
        })
      )
      
      setNodes(nodesWithAnswers)
    } catch (error) {
      console.error('Error loading nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const answers = newNode.type === 'question' ? newNode.answers.filter(a => a.trim()) : undefined
      const node = await createUserJourneyNode(
        journey.id,
        newNode.type,
        newNode.description,
        newNode.parentNodeId || undefined,
        newNode.parentAnswer || undefined,
        newNode.painPoint || undefined,
        answers
      )
      
      if (node) {
        const nodeWithAnswers = { ...node, answers: answers || [] }
        setNodes([...nodes, nodeWithAnswers])
        setNewNode({
          type: 'task',
          description: '',
          parentNodeId: '',
          parentAnswer: '',
          painPoint: '',
          answers: ['']
        })
        setShowNodeForm(false)
      }
    } catch (error) {
      console.error('Error creating node:', error)
    }
  }

  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNode) return
    
    try {
      const answers = editingNode.type === 'question' ? editingNode.answers?.filter(a => a.trim()) : undefined
      const updatedNode = await updateUserJourneyNode(
        editingNode.id,
        {
          type: editingNode.type,
          description: editingNode.description,
          parent_node_id: editingNode.parent_node_id,
          parent_answer: editingNode.parent_answer,
          pain_point: editingNode.pain_point
        },
        answers
      )
      
      if (updatedNode) {
        const nodeWithAnswers = { ...updatedNode, answers: answers || [] }
        setNodes(nodes.map(n => n.id === updatedNode.id ? nodeWithAnswers : n))
        setEditingNode(null)
      }
    } catch (error) {
      console.error('Error updating node:', error)
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      try {
        const success = await deleteUserJourneyNode(nodeId)
        if (success) {
          setNodes(nodes.filter(n => n.id !== nodeId))
        }
      } catch (error) {
        console.error('Error deleting node:', error)
      }
    }
  }

  const handleUpdateJourney = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const updated = await updateUserJourney(
        journey.id,
        { name: editingJourney.name },
        editingJourney.stakeholderIds
      )
      
      if (updated) {
        // Update the journey object
        journey.name = updated.name
        setShowEditJourneyForm(false)
      }
    } catch (error) {
      console.error('Error updating journey:', error)
    }
  }

  const getAvailableParentNodes = () => {
    const allOptions: Array<{ id: string; label: string; type: 'node' | 'answer' }> = []
    
    nodes.forEach(node => {
      // Add the node itself as a parent option
      allOptions.push({
        id: node.id,
        label: node.description,
        type: 'node'
      })
      
      // If it's a question node with answers, add each answer as a parent option
      if (node.type === 'question' && node.answers) {
        node.answers.forEach(answer => {
          allOptions.push({
            id: `${node.id}:${answer}`,
            label: `   ↳ "${answer}"`,
            type: 'answer'
          })
        })
      }
    })
    
    return allOptions
  }

  const getAssignedJourneyStakeholders = () => {
    return assignedStakeholders.filter(stakeholder => 
      editingJourney.stakeholderIds.includes(stakeholder.id)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <UserJourneyHeader
        journey={journey}
        assignedStakeholders={getAssignedJourneyStakeholders()}
        userRoles={userRoles}
        onBack={onBack}
        onEdit={() => setShowEditJourneyForm(true)}
      />
      
      <div className="flex justify-end mb-6 px-6">
        <button
          onClick={() => setShowNodeForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Add Node
        </button>
      </div>

      {showEditJourneyForm && (
        <EditJourneyModal
          journey={journey}
          assignedStakeholders={assignedStakeholders}
          editingJourney={editingJourney}
          onUpdate={setEditingJourney}
          onSubmit={handleUpdateJourney}
          onClose={() => setShowEditJourneyForm(false)}
        />
      )}

      {showNodeForm && (
        <NodeModal
          isEditing={false}
          node={newNode}
          availableParentNodes={getAvailableParentNodes()}
          onUpdate={(updates) => setNewNode({ ...newNode, ...updates })}
          onSubmit={handleCreateNode}
          onClose={() => setShowNodeForm(false)}
        />
      )}

      {editingNode && (
        <NodeModal
          isEditing={true}
          node={{
            type: editingNode.type,
            description: editingNode.description,
            parentNodeId: editingNode.parent_node_id || '',
            parentAnswer: editingNode.parent_answer || '',
            painPoint: editingNode.pain_point || '',
            answers: editingNode.answers || ['']
          }}
          availableParentNodes={getAvailableParentNodes().filter(option => 
            option.id !== editingNode.id && !option.id.startsWith(editingNode.id + ':')
          )}
          onUpdate={(updates) => setEditingNode({ 
            ...editingNode, 
            ...updates,
            parent_node_id: updates.parentNodeId || editingNode.parent_node_id,
            parent_answer: updates.parentAnswer !== undefined ? updates.parentAnswer : editingNode.parent_answer,
            pain_point: updates.painPoint !== undefined ? updates.painPoint : editingNode.pain_point
          })}
          onSubmit={handleUpdateNode}
          onClose={() => setEditingNode(null)}
        />
      )}

      <NodeVisualization
        nodes={nodes}
        onEditNode={setEditingNode}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  )
}