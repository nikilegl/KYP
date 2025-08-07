import React from 'react'
import { X, Loader2 } from 'lucide-react'

const colorOptions = [
  '#3B82F6', // Blue
  '#00AA72', // Emerald
  '#E18E00', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#04ABC8', // Cyan
  '#67A812', // Lime
  '#D75800', // Orange
  '#E22D87', // Pink
]

interface ThemeFormProps {
  isEditing: boolean
  theme: {
    name: string
    description: string
    color: string
  }
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; description: string; color: string }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function ThemeForm({
  isEditing,
  theme,
  loading,
  onUpdate,
  onSubmit,
  onClose
}: ThemeFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Theme' : 'Add New Theme'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme Name</label>
              <input
                type="text"
                value={theme.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
                placeholder="Enter theme name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={theme.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
                placeholder="Describe this theme..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex items-center gap-2 mb-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdate({ color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      theme.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.color }}
                />
                Selected: {theme.color}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={loading || !theme.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Update Theme' : 'Add Theme'}
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