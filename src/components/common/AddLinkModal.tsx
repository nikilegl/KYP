import React, { useState } from 'react'
import { X, Save, ExternalLink } from 'lucide-react'

interface AddLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveLink: (name: string, url: string) => Promise<void>
  isEditing?: boolean
  initialName?: string
  initialUrl?: string
}

export function AddLinkModal({ 
  isOpen, 
  onClose, 
  onSaveLink, 
  isEditing = false,
  initialName = '',
  initialUrl = ''
}: AddLinkModalProps) {
  const [name, setName] = useState(initialName)
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)

  // Update state when props change (for editing mode)
  React.useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setUrl(initialUrl)
    }
  }, [isOpen, initialName, initialUrl])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !url.trim()) return
    
    setSaving(true)
    try {
      await onSaveLink(name.trim(), url.trim())
      // Reset form
      setName('')
      setUrl('')
      onClose()
    } catch (error) {
      console.error('Error saving link:', error)
      alert('Failed to save link. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setName('')
      setUrl('')
      onClose()
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Link' : 'Add Link'}
          </h3>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter link name..."
                required
                disabled={saving}
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link URL *
              </label>
              <div className="relative">
                <ExternalLink size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    url && !isValidUrl(url) ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com"
                  required
                  disabled={saving}
                />
              </div>
              {url && !isValidUrl(url) && (
                <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
              )}
            </div>
            
            <div className="flex items-center gap-3 pt-4">
              <button 
                type="submit" 
                disabled={saving || !name.trim() || !url.trim() || !isValidUrl(url)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : (isEditing ? 'Update Link' : 'Save Link')}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
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