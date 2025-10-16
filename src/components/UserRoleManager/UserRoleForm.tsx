import React from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import type { UserRole } from '../../lib/supabase'

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

interface UserRoleFormProps {
  isEditing: boolean
  userRole: {
    name: string
    colour: string
    icon: string
    glossy_icon?: string
  }
  loading: boolean
  uploadingIcon?: boolean
  onUpdate: (updates: Partial<{ name: string; colour: string; icon: string; glossy_icon?: string }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  onGlossyIconUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function UserRoleForm({
  isEditing,
  userRole,
  loading,
  uploadingIcon = false,
  onUpdate,
  onSubmit,
  onClose,
  onGlossyIconUpload
}: UserRoleFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit User Role' : 'Add New User Role'}
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
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
              <input
                type="text"
                value={userRole.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <input
                type="text"
                value={userRole.icon || ''}
                onChange={(e) => onUpdate({ icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                placeholder="👤"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Glossy Icon (SVG)</label>
              <p className="text-xs text-gray-500 mb-2">Upload an SVG file for the glossy icon</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('glossy-icon-upload')?.click()}
                  disabled={loading || uploadingIcon}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploadingIcon ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload SVG
                    </>
                  )}
                </button>
                <input
                  id="glossy-icon-upload"
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={onGlossyIconUpload}
                  className="hidden"
                  disabled={loading || uploadingIcon}
                />
                {userRole.glossy_icon && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: userRole.glossy_icon }}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate({ glossy_icon: undefined })}
                      disabled={loading}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colour</label>
              <div className="flex items-center gap-2 mb-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdate({ colour: color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      userRole.colour === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: userRole.colour }}
                />
                Selected: {userRole.colour}
              </div>
              
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Or enter custom hex color
                </label>
                <input
                  type="text"
                  value={userRole.colour}
                  onChange={(e) => onUpdate({ colour: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#RRGGBB"
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Update Role' : 'Add Role'}
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