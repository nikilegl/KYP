import React, { useState, useEffect } from 'react'
import { Edit, Save, X, CheckCircle, Plus, Trash2 } from 'lucide-react'

interface DecisionSectionProps {
  entity: {
    decision_text?: string[] | null
  }
  onSave: (decisionTexts: string[]) => Promise<void>
  saving: boolean
}

export function DecisionSection({ entity, onSave, saving }: DecisionSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<string[]>([])
  const [currentDecisions, setCurrentDecisions] = useState<string[]>([])

  // Update currentDecisions when entity.decision_text changes
  useEffect(() => {
    setCurrentDecisions(entity.decision_text || [])
  }, [entity.decision_text])

  const handleEdit = () => {
    const decisions = entity.decision_text || []
    setEditValues(decisions.length > 0 ? [...decisions] : [''])
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      const filteredDecisions = editValues.filter(decision => decision.trim() !== '')
      await onSave(filteredDecisions)
      // Immediately update local state with the saved decisions
      setCurrentDecisions(filteredDecisions)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving decisions:', error)
      alert('Failed to save decisions. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditValues([])
    setIsEditing(false)
  }

  const addDecision = () => {
    setEditValues([...editValues, ''])
  }

  const removeDecision = (index: number) => {
    if (editValues.length > 1) {
      setEditValues(editValues.filter((_, i) => i !== index))
    }
  }

  const updateDecision = (index: number, value: string) => {
    const newValues = [...editValues]
    newValues[index] = value
    setEditValues(newValues)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Decisions ({currentDecisions.length})
          </h2>
        </div>
        
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {editValues.map((decision, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={decision}
                  onChange={(e) => updateDecision(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter decision..."
                  disabled={saving}
                />
                {editValues.length > 1 && (
                  <button
                    onClick={() => removeDecision(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    disabled={saving}
                    title="Remove decision"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={addDecision}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            disabled={saving}
          >
            <Plus size={16} />
            Add Decision
          </button>
          
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {currentDecisions.length > 0 ? (
            currentDecisions.map((decision, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-medium">{decision}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No decisions recorded</p>
          )}
        </div>
      )}
    </div>
  )
}