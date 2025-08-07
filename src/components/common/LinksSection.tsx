import React, { useState } from 'react'
import { Edit, Save, X, Plus, Trash2, ExternalLink } from 'lucide-react'
import { AddLinkModal } from './AddLinkModal'

interface Link {
  id: string
  name: string
  url: string
}

interface EditableLink {
  id?: string
  name: string
  url: string
}

interface LinksSectionProps {
  entityId: string
  entityType: string
  links: Link[]
  onSaveLinks: (links: EditableLink[]) => Promise<void>
  saving: boolean
  className?: string
}

export function LinksSection({ 
  entityId, 
  entityType, 
  links, 
  onSaveLinks, 
  saving,
  className = ''
}: LinksSectionProps) {
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)
  const [editingLinks, setEditingLinks] = useState(false)
  const [editableLinks, setEditableLinks] = useState<EditableLink[]>([])
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingLinkData, setEditingLinkData] = useState<{ name: string; url: string }>({ name: '', url: '' })

  const handleAddNewLink = async (name: string, url: string) => {
    try {
      // Create new link and combine with existing links
      const newLink: EditableLink = { name, url }
      const updatedLinks = [...links.map(link => ({ ...link })), newLink]
      await onSaveLinks(updatedLinks)
      setShowAddLinkModal(false)
    } catch (error) {
      console.error('Error adding new link:', error)
      throw error
    }
  }

  const handleEditLink = (link: Link) => {
    setEditingLinkId(link.id)
    setEditingLinkData({ name: link.name, url: link.url })
    setShowAddLinkModal(true)
  }

  const handleSaveEditedLink = async (name: string, url: string) => {
    if (!editingLinkId) return
    
    try {
      // Update the specific link and save all links
      const updatedLinks = links.map(link => 
        link.id === editingLinkId 
          ? { ...link, name, url }
          : link
      )
      await onSaveLinks(updatedLinks)
      setEditingLinkId(null)
      setEditingLinkData({ name: '', url: '' })
      setShowAddLinkModal(false)
    } catch (error) {
      console.error('Error updating link:', error)
      throw error
    }
  }

  const handleCloseModal = () => {
    setShowAddLinkModal(false)
    setEditingLinkId(null)
    setEditingLinkData({ name: '', url: '' })
  }

  const handleEditLinks = () => {
    setEditableLinks(links.map(link => ({ ...link })))
    setEditingLinks(true)
  }

  const handleSaveEditedLinks = async () => {
    try {
      const validLinks = editableLinks.filter(link => link.name.trim() && link.url.trim())
      await onSaveLinks(validLinks)
      setEditingLinks(false)
    } catch (error) {
      console.error('Error saving links:', error)
      alert('Failed to save links. Please try again.')
    }
  }

  const handleCancelEditLinks = () => {
    setEditableLinks([])
    setEditingLinks(false)
  }

  const addEditableLink = () => {
    setEditableLinks([...editableLinks, { name: '', url: '' }])
  }

  const removeEditableLink = (index: number) => {
    setEditableLinks(editableLinks.filter((_, i) => i !== index))
  }

  const updateEditableLink = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...editableLinks]
    updated[index][field] = value
    setEditableLinks(updated)
  }

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  const formatUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return `https://${url}`
  }

  // If no links exist and not editing, show just the Add Link button
  if (links.length === 0 && !editingLinks) {
    return (
      <div className={className}>
        <button
          onClick={() => setShowAddLinkModal(true)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <Plus size={16} />
          Add Link
        </button>

        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          onSaveLink={handleAddNewLink}
        />
      </div>
    )
  }

  // Show the full links card when links exist or when editing
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Links ({links.length})
        </h2>
        
        {!editingLinks && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddLinkModal(true)}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
            <button
              onClick={handleEditLinks}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Edit size={14} />
              Edit
            </button>
          </div>
        )}
      </div>

      {editingLinks ? (
        <div className="space-y-4">
          {editableLinks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No links added yet</p>
              <button
                type="button"
                onClick={addEditableLink}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
                Add First Link
              </button>
            </div>
          ) : (
            <>
              {editableLinks.map((link, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link Name
                      </label>
                      <input
                        type="text"
                        value={link.name}
                        onChange={(e) => updateEditableLink(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter link name..."
                        disabled={saving}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link URL
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateEditableLink(index, 'url', e.target.value)}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            link.url && !isValidUrl(link.url) ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="https://example.com"
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => removeEditableLink(index)}
                          disabled={saving}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Remove link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {link.url && !isValidUrl(link.url) && (
                        <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addEditableLink}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
                Add Link
              </button>
            </>
          )}
          
          <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveEditedLinks}
              disabled={saving}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            
            <button
              onClick={handleCancelEditLinks}
              disabled={saving}
              className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {links.length > 0 ? (
            links.map((link) => (
              <div 
                key={link.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => window.open(formatUrl(link.url), '_blank', 'noopener,noreferrer')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{link.name}</p>
                    <p className="text-sm text-gray-600 truncate max-w-md">{link.url}</p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditLink(link)
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit size={12} />
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic text-center py-4">No links added</p>
          )}
        </div>
      )}

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={handleCloseModal}
        onSaveLink={editingLinkId ? handleSaveEditedLink : handleAddNewLink}
        isEditing={!!editingLinkId}
        initialName={editingLinkData.name}
        initialUrl={editingLinkData.url}
      />
    </div>
  )
}