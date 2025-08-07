import React, { useState, useEffect } from 'react'
import { CKEditorComponent } from '../CKEditorComponent'
import type { ResearchNote } from '../../lib/supabase'

interface NoteContentTabsProps {
  note: ResearchNote
  onUpdateSummary: (summary: string) => Promise<ResearchNote | null>
  saving: boolean
}

export function NoteContentTabs({ 
  note, 
  onUpdateSummary, 
  saving
}: NoteContentTabsProps) {
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryEditValue, setSummaryEditValue] = useState('')
  const [displaySummary, setDisplaySummary] = useState('')

  // Sync edit values when note changes
  useEffect(() => {
    setSummaryEditValue(note.summary || '')
    setDisplaySummary(note.summary || '')
  }, [note])

  const handleSaveSummary = async () => {
    try {
      const updatedNote = await onUpdateSummary(summaryEditValue)
      if (updatedNote) {
        setSummaryEditValue(updatedNote.summary || '')
        setDisplaySummary(updatedNote.summary || '')
      }
      setEditingSummary(false)
    } catch (error) {
      console.error('Error updating summary:', error)
      alert('Failed to save summary. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Content */}
      <div className="p-6">
        <div>
          {editingSummary ? (
            <div className="space-y-4">
              <CKEditorComponent
                value={summaryEditValue}
                onChange={setSummaryEditValue}
                placeholder="Enter summary..."
                disabled={saving}
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveSummary}
                  disabled={saving}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                
                <button
                  onClick={() => {
                    setSummaryEditValue(displaySummary)
                    setEditingSummary(false)
                  }}
                  disabled={saving}
                  className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="prose max-w-none text-gray-700">
                  {displaySummary ? (
                    <div 
                      className="whitespace-pre-line leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: displaySummary }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No summary available</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSummaryEditValue(displaySummary)
                  setEditingSummary(true)
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}