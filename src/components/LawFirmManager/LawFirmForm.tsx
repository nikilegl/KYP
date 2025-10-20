import React from 'react'
import { Star } from 'lucide-react'
import { Button } from '../DesignSystem/components'
import { Modal } from '../DesignSystem/components/Modal'
import type { LawFirm } from '../../lib/supabase'

interface LawFirmFormProps {
  isOpen: boolean
  isEditing: boolean
  lawFirm: {
    name: string
    structure: 'centralised' | 'decentralised'
    status: 'active' | 'inactive'
    top_4: boolean
  }
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; structure: 'centralised' | 'decentralised'; status: 'active' | 'inactive'; top_4: boolean }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function LawFirmForm({
  isOpen,
  isEditing,
  lawFirm,
  loading,
  onUpdate,
  onSubmit,
  onClose
}: LawFirmFormProps) {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Law Firm' : 'Add New Law Firm'}
      size="md"
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={loading}
            loading={loading}
            onClick={handleFormSubmit}
          >
            {isEditing ? 'Update Law Firm' : 'Add Law Firm'}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Firm Name</label>
          <input
            type="text"
            value={lawFirm.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Structure</label>
          <select
            value={lawFirm.structure}
            onChange={(e) => onUpdate({ structure: e.target.value as 'centralised' | 'decentralised' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="decentralised">Decentralised</option>
            <option value="centralised">Centralised</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              Law firm is top 4
            </div>
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="top_4"
                checked={lawFirm.top_4 === true}
                onChange={() => onUpdate({ top_4: true })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="top_4"
                checked={lawFirm.top_4 === false}
                onChange={() => onUpdate({ top_4: false })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  )
}