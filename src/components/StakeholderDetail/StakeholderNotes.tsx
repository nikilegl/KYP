import React, { useState } from 'react'
import { Edit, Save, X } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface StakeholderNotesProps {
  notes: string
  onSave: (notes: string) => Promise<void>
}

export function StakeholderNotes({ notes, onSave }: StakeholderNotesProps) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(notes || '')
  const [saving, setSaving] = useState(false)

  const handleSaveNotes = async () => {
    setSaving(true)
    
    try {
      await onSave(notesValue)
      setEditingNotes(false)
    } catch (error) {
      console.error('Error updating stakeholder notes:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingNotes(false)
    setNotesValue(notes || '')
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
        {!editingNotes && (
          <button
            onClick={() => setEditingNotes(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <Edit size={14} />
            Edit
          </button>
        )}
      </div>

      {editingNotes ? (
        <div className="space-y-4">
          <CKEditorComponent
            value={notesValue}
            onChange={setNotesValue}
            placeholder="Add notes about this stakeholder..."
            disabled={saving}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
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
          {notes ? (
            <div 
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: notes }}
            />
          ) : (
            <div className="text-gray-500 italic">Add notes about this stakeholder...</div>
          )}
        </div>
      )}
    </div>
  )
}