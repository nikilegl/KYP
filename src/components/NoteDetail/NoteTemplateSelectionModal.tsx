import React, { useState } from 'react'
import { X, FileText, Search, Plus } from 'lucide-react'
import type { NoteTemplate } from '../../lib/supabase'

interface NoteTemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  noteTemplates: NoteTemplate[]
  onSelectTemplate: (templateBody: string) => void
}

export function NoteTemplateSelectionModal({
  isOpen,
  onClose,
  noteTemplates,
  onSelectTemplate
}: NoteTemplateSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredTemplates = noteTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTemplateSelect = (template: NoteTemplate) => {
    onSelectTemplate(template.body || '')
    onClose()
  }

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Note Template</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Template List */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {filteredTemplates.length > 0 ? (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.body ? stripHtml(template.body) : 'No content'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 text-blue-600">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No templates found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No note templates available.</p>
              <p className="text-sm text-gray-400 mt-2">Create templates from the Note Templates section.</p>
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}