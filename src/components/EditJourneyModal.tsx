import React, { useEffect } from 'react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { RichTextDescription } from './DesignSystem/components/RichTextDescription'
import { Plus } from 'lucide-react'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import type { Project, LawFirm } from '../lib/supabase'

interface EditJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  journeyName: string
  journeyDescription: string
  journeyLayout: 'vertical' | 'horizontal'
  journeyStatus: 'draft' | 'published'
  selectedProjectId: string
  selectedLawFirmIds: string[]
  lawFirmSearchQuery: string
  projects: Project[]
  lawFirms: LawFirm[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onLayoutChange: (layout: 'vertical' | 'horizontal') => void
  onStatusChange: (status: 'draft' | 'published') => void
  onProjectChange: (projectId: string) => void
  onLawFirmSearchChange: (query: string) => void
  onLawFirmToggle: (firmId: string, checked: boolean) => void
  onAddLawFirmClick: () => void
  saveDisabled?: boolean
}

export function EditJourneyModal({
  isOpen,
  onClose,
  onSave,
  journeyName,
  journeyDescription,
  journeyLayout,
  journeyStatus,
  selectedProjectId,
  selectedLawFirmIds,
  lawFirmSearchQuery,
  projects,
  lawFirms,
  onNameChange,
  onDescriptionChange,
  onLayoutChange,
  onStatusChange,
  onProjectChange,
  onLawFirmSearchChange,
  onLawFirmToggle,
  onAddLawFirmClick,
  saveDisabled = false
}: EditJourneyModalProps) {
  const filteredLawFirms = lawFirms.filter(firm =>
    lawFirmSearchQuery.trim() === '' ||
    firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
  )

  // Handle Enter key to trigger Save Details
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Enter is pressed and journey name is not empty
      if (event.key === 'Enter' && journeyName.trim() && !saveDisabled) {
        // Don't trigger if user is typing in a textarea (they might want to add a newline)
        const target = event.target as HTMLElement
        if (target.tagName === 'TEXTAREA') {
          return
        }
        
        event.preventDefault()
        onSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, journeyName, saveDisabled, onSave])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Journey Details"
      size="md"
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saveDisabled || !journeyName.trim()}
          >
            Save Details
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Journey Name * <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
          </label>
          <EmojiAutocomplete
            value={journeyName}
            onChange={onNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter journey name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <RichTextDescription
            value={journeyDescription}
            onChange={onDescriptionChange}
            placeholder="Optional description (use Link button to add hyperlinks)"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Layout
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onLayoutChange('vertical')}
              className={`
                flex-1 px-4 py-2 rounded-lg border-2 transition-all
                ${journeyLayout === 'vertical'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }
              `}
            >
              <div className="text-center">
                <div className="font-medium">Vertical</div>
                <div className="text-xs mt-1">Top to bottom flow</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('horizontal')}
              className={`
                flex-1 px-4 py-2 rounded-lg border-2 transition-all
                ${journeyLayout === 'horizontal'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }
              `}
            >
              <div className="text-center">
                <div className="font-medium">Horizontal</div>
                <div className="text-xs mt-1">Left to right flow</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Publish to make this journey accessible to everyone in Legl
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={journeyStatus === 'published'}
                onChange={(e) => onStatusChange(e.target.checked ? 'published' : 'draft')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {journeyStatus === 'published' ? 'Published' : 'Draft'}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Epic
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No Epic</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Law Firms
          </label>
          <input
            type="text"
            value={lawFirmSearchQuery}
            onChange={(e) => onLawFirmSearchChange(e.target.value)}
            placeholder="Search law firms..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
          />
          <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
            {filteredLawFirms.map(firm => (
              <label
                key={firm.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedLawFirmIds.includes(firm.id)}
                  onChange={(e) => onLawFirmToggle(firm.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{firm.name}</span>
              </label>
            ))}
            {filteredLawFirms.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-gray-500 mb-2">No law firms found</p>
                <Button
                  variant="outline"
                  size="small"
                  icon={Plus}
                  onClick={onAddLawFirmClick}
                >
                  Add Law Firm
                </Button>
              </div>
            )}
          </div>
          {selectedLawFirmIds.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedLawFirmIds.length} law firm{selectedLawFirmIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

