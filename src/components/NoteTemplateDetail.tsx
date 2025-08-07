import React, { useState, useEffect } from 'react'
import { ArrowLeft, Edit, Save, X } from 'lucide-react'
import { CKEditorComponent } from './CKEditorComponent'
import { updateNoteTemplate } from '../lib/database'
import type { NoteTemplate } from '../lib/supabase'

interface NoteTemplateDetailProps {
  template: NoteTemplate
  onBack: () => void
  onUpdate: (updatedTemplate: NoteTemplate) => void
}

export function NoteTemplateDetail({ template, onBack, onUpdate }: NoteTemplateDetailProps) {
  const [editingName, setEditingName] = useState(false)
  const [editingBody, setEditingBody] = useState(false)
  const [name, setName] = useState(template.name)
  const [body, setBody] = useState(template.body || '')
  const [saving, setSaving] = useState(false)

  // Update local state when template prop changes
  useEffect(() => {
    setName(template.name)
    setBody(template.body || '')
  }, [template])

  const handleSaveName = async () => {
    if (!name.trim()) return
    
    setSaving(true)
    try {
      const updatedTemplate = await updateNoteTemplate(template.id, { name: name.trim() })
      if (updatedTemplate) {
        onUpdate(updatedTemplate)
        setEditingName(false)
      }
    } catch (error) {
      console.error('Error updating template name:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBody = async () => {
    setSaving(true)
    try {
      const updatedTemplate = await updateNoteTemplate(template.id, { body })
      if (updatedTemplate) {
        onUpdate(updatedTemplate)
        setEditingBody(false)
      }
    } catch (error) {
      console.error('Error updating template body:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEditName = () => {
    setName(template.name)
    setEditingName(false)
  }

  const handleCancelEditBody = () => {
    setBody(template.body || '')
    setEditingBody(false)
  }

  return (
    <div className="h-full flex flex-col w-full">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              Back to Note Templates
            </button>
            
            {/* Template Name */}
            {editingName ? (
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                  disabled={saving}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditName}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit size={14} />
                  Edit Name
                </button>
              </div>
            )}
            
            <p className="text-sm text-gray-500">
              Created {new Date(template.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full space-y-6 p-6">
          {/* Template Body */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Template Content</h3>
              {!editingBody && (
                <button
                  onClick={() => setEditingBody(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit size={14} />
                  Edit
                </button>
              )}
            </div>

            {editingBody ? (
              <div className="space-y-4">
                <CKEditorComponent
                  value={body}
                  onChange={setBody}
                  placeholder="Enter template content..."
                  disabled={saving}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveBody}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEditBody}
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
                {body ? (
                  <div 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                ) : (
                  <div className="text-gray-500 italic">No content added yet. Click "Edit" to add template content.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}