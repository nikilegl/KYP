import React, { useState, useEffect } from 'react'
import { Edit, Check, X } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface NoteNativeNotesSectionProps {
  nativeNotes: string | null
  onSave: (nativeNotes: string) => Promise<void>
  saving: boolean
}

export function NoteNativeNotesSection({ nativeNotes, onSave, saving }: NoteNativeNotesSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  // Update editValue when nativeNotes changes or when starting to edit
  useEffect(() => {
    if (isEditing) {
      setEditValue(nativeNotes || '')
    }
  }, [nativeNotes, isEditing])

  const handleSave = async () => {
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving native notes:', error)
    }
  }

  const handleCancel = () => {
    setEditValue('')
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Native Notes</h2>
        
        {!isEditing && (
          <button
            onClick={() => {
              setEditValue(nativeNotes || '')
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
            placeholder="Enter native notes..."
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
        <div className="prose max-w-none">
          {nativeNotes ? (
            <div dangerouslySetInnerHTML={{ __html: nativeNotes }} />
          ) : (
            <p className="text-gray-500 italic">Add native notes...</p>
          )}
        </div>
      )}
    </div>
  )
}