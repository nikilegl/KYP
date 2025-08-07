import React from 'react'
import { X, Loader2 } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface NoteTemplateFormProps {
  isEditing: boolean
  template: {
    name: string
    body: string
  }
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; body: string }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function NoteTemplateForm({
  isEditing,
  template,
  loading,
  onUpdate,
  onSubmit,
  onClose
}: NoteTemplateFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Note Template' : 'Add New Note Template'}
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
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
                placeholder="Enter template name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Body</label>
              <CKEditorComponent
                value={template.body}
                onChange={(value) => onUpdate({ body: value })}
                placeholder="Enter template content..."
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={loading || !template.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Update Template' : 'Add Template'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={loading}
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