import React, { useState } from 'react'
import { Edit, Save, X } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface EditableContentSectionProps {
  title: string
  initialContent: string
  placeholder: string
  onSave: (content: string) => Promise<void>
  className?: string
}

export function EditableContentSection({
  title,
  initialContent,
  placeholder,
  onSave,
  className = ''
}: EditableContentSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)

  // Sync editContent with initialContent when it changes
  React.useEffect(() => {
    setEditContent(initialContent)
  }, [initialContent])

  // Sync editContent with initialContent when it changes
  React.useEffect(() => {
    setEditContent(initialContent)
  }, [initialContent])

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(initialContent) // Ensure we start with the latest content
    setEditContent(initialContent) // Ensure we start with the latest content
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      await onSave(editContent)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving content:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditContent(initialContent) // Reset to current content
    setEditContent(initialContent) // Reset to current content
  }

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <Edit size={14} />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <CKEditorComponent
            value={editContent}
            onChange={setEditContent}
            placeholder={placeholder}
            disabled={saving}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          {initialContent ? (
            <div 
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: initialContent }}
            />
          ) : (
            <div className="text-gray-500 italic">{placeholder}</div>
          )}
        </div>
      )}
    </div>
  )
}