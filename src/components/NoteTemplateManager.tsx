import React, { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { NoteTemplateForm } from './NoteTemplateManager/NoteTemplateForm'
import { NoteTemplateTable } from './NoteTemplateManager/NoteTemplateTable'
import type { NoteTemplate } from '../lib/supabase'

interface NoteTemplateManagerProps {
  noteTemplates: NoteTemplate[]
  onCreateNoteTemplate: (name: string, body?: string) => Promise<void>
  onUpdateNoteTemplate: (templateId: string, updates: { name?: string; body?: string }) => Promise<void>
  onDeleteNoteTemplate: (templateId: string) => Promise<void>
  onSelectNoteTemplate: (template: NoteTemplate) => void
}

export function NoteTemplateManager({ 
  noteTemplates, 
  onCreateNoteTemplate, 
  onUpdateNoteTemplate, 
  onDeleteNoteTemplate,
  onSelectNoteTemplate
}: NoteTemplateManagerProps) {
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '' })
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [updatingTemplate, setUpdatingTemplate] = useState(false)

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingTemplate(true)
    
    try {
      await onCreateNoteTemplate(newTemplate.name, newTemplate.body || undefined)
      setNewTemplate({ name: '', body: '' })
      setShowTemplateForm(false)
    } catch (error) {
      console.error('Error creating note template:', error)
    } finally {
      setCreatingTemplate(false)
    }
  }

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return
    
    setUpdatingTemplate(true)
    
    try {
      await onUpdateNoteTemplate(editingTemplate.id, {
        name: editingTemplate.name,
        body: editingTemplate.body
      })
      setEditingTemplate(null)
    } catch (error) {
      console.error('Error updating note template:', error)
    } finally {
      setUpdatingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (window.confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      try {
        await onDeleteNoteTemplate(templateId)
      } catch (error) {
        console.error('Error deleting note template:', error)
      }
    }
  }

  const handleRowClick = (template: NoteTemplate) => {
    onSelectNoteTemplate(template)
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Note Templates</h2>
          <p className="text-gray-600">Create reusable templates for note summaries</p>
        </div>
        <button
          onClick={() => setShowTemplateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Add Template
        </button>
      </div>

      {/* Create Template Form */}
      {showTemplateForm && (
        <NoteTemplateForm
          isEditing={false}
          template={newTemplate}
          loading={creatingTemplate}
          onUpdate={(updates) => setNewTemplate({ ...newTemplate, ...updates })}
          onSubmit={handleCreateTemplate}
          onClose={() => setShowTemplateForm(false)}
        />
      )}

      {/* Edit Template Form */}
      {editingTemplate && (
        <NoteTemplateForm
          isEditing={true}
          template={{
            name: editingTemplate.name,
            body: editingTemplate.body || ''
          }}
          loading={updatingTemplate}
          onUpdate={(updates) => setEditingTemplate({ ...editingTemplate, ...updates })}
          onSubmit={handleUpdateTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      <NoteTemplateTable
        noteTemplates={noteTemplates}
        onEdit={setEditingTemplate}
        onDelete={handleDeleteTemplate}
        onRowClick={handleRowClick}
      />
    </div>
  )
}