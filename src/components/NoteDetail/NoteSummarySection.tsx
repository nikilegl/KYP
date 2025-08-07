import React, { useState, useEffect } from 'react'
import { Edit, Check, X } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface NoteSummarySectionProps {
  summary: string | null
  onSave: (summary: string) => Promise<void>
  saving: boolean
}

export function NoteSummarySection({ summary, onSave, saving }: NoteSummarySectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  // Update editValue when summary changes or when starting to edit
  useEffect(() => {
    if (isEditing) {
      setEditValue(summary || '')
    }
  }, [summary, isEditing])

  const handleSave = async () => {
    try {
      await onSave(editValue)
      setIsEditing(false)
      // The summary prop will be updated by the parent component after successful save
    } catch (error) {
      console.error('Error saving summary:', error)
      // Show user-friendly error message
      alert('Failed to save summary. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditValue('')
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        
        {!isEditing && (
          <button
            onClick={() => {
              setEditValue(summary || '')
              setIsEditing(true)
            }}
            className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <CKEditorComponent
            value={editValue}
            onChange={(value) => setEditValue(value)}
            placeholder="Enter summary..."
          />
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4 mr-1" />
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
        <div className="prose max-w-none text-gray-700">
          {summary ? (
            <div 
              className="whitespace-pre-line leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: summary
                  .replace(/<p>/g, '')
                  .replace(/<\/p>/g, '\n')
                  .replace(/<br\s*\/?>/g, '\n')
                  .replace(/&nbsp;/g, ' ')
                  .trim()
              }} 
            />
          ) : (
            <p className="text-gray-500 italic">No key points could be extracted from the notes</p>
          )}
        </div>
      )}
    </div>
  )
}