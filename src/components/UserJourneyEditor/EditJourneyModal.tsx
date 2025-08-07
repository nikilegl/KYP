import React from 'react'
import { X } from 'lucide-react'
import type { UserJourney, Stakeholder } from '../../lib/supabase'

interface EditJourneyModalProps {
  journey: UserJourney
  assignedStakeholders: Stakeholder[]
  editingJourney: {
    name: string
    stakeholderIds: string[]
  }
  onUpdate: (updates: { name: string; stakeholderIds: string[] }) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function EditJourneyModal({
  journey,
  assignedStakeholders,
  editingJourney,
  onUpdate,
  onSubmit,
  onClose
}: EditJourneyModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit User Journey</h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Journey Name</label>
              <input
                type="text"
                value={editingJourney.name}
                onChange={(e) => onUpdate({ ...editingJourney, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Stakeholders</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {assignedStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500">No stakeholders assigned to this project</p>
                ) : (
                  assignedStakeholders.map((stakeholder) => (
                    <label key={stakeholder.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingJourney.stakeholderIds.includes(stakeholder.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onUpdate({
                              ...editingJourney,
                              stakeholderIds: [...editingJourney.stakeholderIds, stakeholder.id]
                            })
                          } else {
                            onUpdate({
                              ...editingJourney,
                              stakeholderIds: editingJourney.stakeholderIds.filter(id => id !== stakeholder.id)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{stakeholder.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-4">
              <button 
                type="submit" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Update Journey
              </button>
              <button
                type="button"
                onClick={onClose}
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