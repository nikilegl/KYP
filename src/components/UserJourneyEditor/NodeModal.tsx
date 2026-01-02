import React from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { UserJourneyNode } from '../../lib/supabase'

interface NodeModalProps {
  isEditing: boolean
  node: {
    type: 'task' | 'question'
    description: string
    parentNodeId: string
    parentAnswer: string
    painPoint: string
    answers: string[]
  }
  availableParentNodes: Array<{ id: string; label: string; type: 'node' | 'answer' }>
  onUpdate: (updates: Partial<typeof node>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function NodeModal({
  isEditing,
  node,
  availableParentNodes,
  onUpdate,
  onSubmit,
  onClose
}: NodeModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Prevent closing on overlay click - only close via close button, cancel, or save
        if (e.target === e.currentTarget) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Node' : 'Add New Node'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Node Type</label>
                <select
                  value={node.type}
                  onChange={(e) => onUpdate({ type: e.target.value as 'task' | 'question' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="task">Task</option>
                  <option value="question">Question</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Node (Optional)</label>
                <select
                  value={node.parentNodeId + (node.parentAnswer ? `:${node.parentAnswer}` : '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.includes(':')) {
                      const [nodeId, answer] = value.split(':')
                      onUpdate({ parentNodeId: nodeId, parentAnswer: answer })
                    } else {
                      onUpdate({ parentNodeId: value, parentAnswer: '' })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No parent (root node)</option>
                  {availableParentNodes.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.type === 'node' 
                        ? option.label.replace(/^[📋❓]\s*/, '') 
                        : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={node.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
                placeholder="Describe what the user does or the question they face..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pain Point (Optional)</label>
              <textarea
                value={node.painPoint}
                onChange={(e) => onUpdate({ painPoint: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe any pain points or challenges at this step..."
              />
            </div>
            
            {/* Answers section for question nodes */}
            {node.type === 'question' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Answers</label>
                <div className="space-y-2">
                  {node.answers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...node.answers]
                          newAnswers[index] = e.target.value
                          onUpdate({ answers: newAnswers })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Answer ${index + 1}`}
                      />
                      {node.answers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newAnswers = node.answers.filter((_, i) => i !== index)
                            onUpdate({ answers: newAnswers })
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onUpdate({ answers: [...node.answers, ''] })}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={16} />
                    Add Answer
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 pt-4">
              <button 
                type="submit" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                {isEditing ? 'Update Node' : 'Add Node'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}