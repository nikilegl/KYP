import React, { useState, useEffect } from 'react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { createUserRole } from '../lib/database/services/userRoleService'
import type { UserRole } from '../lib/supabase'
import { EmojiAutocomplete } from './EmojiAutocomplete'

interface AddUserRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (userRole: UserRole) => void
  initialName?: string
}

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

export function AddUserRoleModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = ''
}: AddUserRoleModalProps) {
  const [formData, setFormData] = useState({ name: initialName, icon: '', colour: '#3B82F6' })
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens/closes or initialName changes
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: initialName, icon: '', colour: '#3B82F6' })
    }
  }, [isOpen, initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const userRole = await createUserRole(
        formData.name.trim(),
        formData.colour,
        formData.icon || undefined
      )
      if (userRole) {
        onSuccess(userRole)
        onClose()
      }
    } catch (error) {
      console.error('Error creating user role:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User Role"
      size="md"
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.name.trim()}>
            {saving ? 'Creating...' : 'Create Role'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter role name"
            required
            autoFocus
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon (Emoji)
          </label>
              <EmojiAutocomplete
                value={formData.icon}
                onChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                placeholder=":"
                disabled={saving}
              />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Colour
          </label>
          <div className="flex items-center gap-2 mb-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, colour: color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.colour === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
                disabled={saving}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div 
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: formData.colour }}
            />
            Selected: {formData.colour}
          </div>
          
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Or enter custom hex color
            </label>
            <input
              type="text"
              value={formData.colour}
              onChange={(e) => setFormData(prev => ({ ...prev, colour: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#RRGGBB"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              disabled={saving}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

