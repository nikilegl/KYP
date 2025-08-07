import React from 'react'
import { Edit, Trash2, Plus, AlertTriangle } from 'lucide-react'
import type { UserJourneyNode } from '../../lib/supabase'

interface NodeWithAnswers extends UserJourneyNode {
  answers?: string[]
}

interface NodeVisualizationProps {
  nodes: NodeWithAnswers[]
  onEditNode: (node: NodeWithAnswers) => void
  onDeleteNode: (nodeId: string) => void
}

export function NodeVisualization({ nodes, onEditNode, onDeleteNode }: NodeVisualizationProps) {
  const buildNodeHierarchy = () => {
    const rootNodes = nodes.filter(node => !node.parent_node_id)
    
    const renderNode = (node: NodeWithAnswers, level = 0): React.ReactNode => {
      // Find direct children (nodes that have this node as parent, no specific answer)
      const directChildren = nodes.filter(n => 
        n.parent_node_id === node.id && !n.parent_answer
      )
      
      // Find answer-based children (nodes that have this node as parent with specific answer)
      const answerChildren = node.type === 'question' && node.answers 
        ? node.answers.map(answer => ({
            answer,
            children: nodes.filter(n => 
              n.parent_node_id === node.id && n.parent_answer === answer
            )
          })).filter(group => group.children.length > 0)
        : []
      
      return (
        <div key={node.id}>
          {/* Node Card */}
          <div 
            className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all max-w-md mx-auto"
          >
            <div className="flex-1">
              <div className="">
                <div>
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      node.type === 'task' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {node.type === 'task' ? 'Task' : 'Question'}
                    </span>
                   
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditNode(node)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="Edit node"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteNode(node.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete node"
                      >
                        <Trash2 size={14} />
                      </button>
                     
                    </div>
                  </div>
                  <h3 className="text-gray-900 font-semibold text-lg mb-2">{node.description}</h3>
                  {node.pain_point && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-800 text-sm"><strong>Painpoint:</strong> {node.pain_point}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show answers for question nodes */}
              {node.type === 'question' && node.answers && node.answers.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Answer Options:</p>
                  <div className="space-y-2">
                    {node.answers.map((answer, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{answer}</span>
                        <span className="text-xs text-blue-600 font-medium">→ 1 node</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Connection lines and children */}
          {(directChildren.length > 0 || answerChildren.length > 0) && (
            <div className="flex flex-col items-center">
              {/* Vertical line down from parent */}
              <div className="w-px h-4 bg-gray-300"></div>
              
              {/* Render direct children horizontally if multiple, vertically if single */}
              {directChildren.length > 0 && (
                <div>
                  {directChildren.length === 1 ? (
                    <div className="flex flex-col items-center">
                      {renderNode(directChildren[0], level + 1)}
                    </div>
                  ) : (
                    <div className="flex items-start gap-8">
                      {directChildren.map(child => (
                        <div key={child.id} className="flex flex-col items-center">
                          {renderNode(child, level + 1)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Render answer-based children */}
              {answerChildren.length > 0 && (
                <div>
                  {/* All answer branches displayed horizontally */}
                  {/* Full width horizontal connector */}
                  <div className="w-full h-px bg-gray-300"></div>
                  <div className="flex items-start gap-8 justify-center">
                    {answerChildren.map(({ answer, children }) => (
                      <div key={`${node.id}-${answer}`} className="flex flex-col items-center">
                        {/* Answer label */}
                        <div>
                          {/* Vertical connector from parent */}
                          <div className="w-px h-4 bg-gray-300 mx-auto"></div>
                          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                            "{answer}"
                          </div>
                        </div>
                        
                        {/* Vertical line down from answer */}
                        <div>
                          <div className="w-px h-4 bg-gray-300"></div>
                        </div>
                        
                        {/* Children nodes for this answer */}
                        {children.length === 1 ? (
                          <div className="flex flex-col items-center">
                            {renderNode(children[0], level + 1)}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            {children.map(child => (
                              <div key={child.id}>
                                {renderNode(child, level + 1)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div className="py-8">
        {rootNodes.length === 1 ? (
          <div className="flex flex-col items-center">
            {renderNode(rootNodes[0])}
          </div>
        ) : (
          <div className="flex items-start gap-8 justify-center">
            {rootNodes.map(node => (
              <div key={node.id} className="flex flex-col items-center">
                {renderNode(node)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {nodes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">No nodes yet. Add your first node to start building the journey!</p>
        </div>
      ) : (
        buildNodeHierarchy()
      )}
    </div>
  )
}