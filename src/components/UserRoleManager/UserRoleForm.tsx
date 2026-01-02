import React from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '../../lib/supabase'
import { EmojiAutocomplete } from '../EmojiAutocomplete'
import { Modal } from '../DesignSystem/components/Modal'
import { Button } from '../DesignSystem/components/Button'

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
  }
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; colour: string; icon: string }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function UserRoleForm({
  isEditing,
  userRole,
  loading,
  onUpdate,
  onSubmit,
  onClose
}: UserRoleFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)

  const handleSubmitClick = () => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }

  return createPortal(
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit User Role' : 'Add New User Role'}
      size="lg"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading}
            loading={loading}
          >
            {isEditing ? 'Update Role' : 'Add Role'}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={onSubmit} className="p-6 space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
              <EmojiAutocomplete
                value={userRole.icon || ''}
                onChange={(value) => onUpdate({ icon: value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                placeholder=":"
                disabled={loading}
              />
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
      </form>
    </Modal>,
    document.body
  )
}