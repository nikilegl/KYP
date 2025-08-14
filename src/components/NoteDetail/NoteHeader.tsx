import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Edit, Calendar, Share, Check } from 'lucide-react'
import { CopyLinkButton } from '../common/CopyLinkButton'
import type { ResearchNote } from '../../lib/supabase'

interface NoteHeaderProps {
  note: ResearchNote
  onBack: () => void
  onEdit: () => void
  onShareToSlack?: () => Promise<void>
  sharingToSlack?: boolean
  slackShareStatus?: { type: 'success' | 'error', message: string } | null
  setSlackShareStatus?: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error', message: string } | null>>
}

export function NoteHeader({ note, onBack, onEdit, onShareToSlack, sharingToSlack, slackShareStatus, setSlackShareStatus }: NoteHeaderProps) {
  // Local state for display values
  const [displayName, setDisplayName] = useState(note.name)
  const [displayDate, setDisplayDate] = useState(note.note_date || note.created_at)
  
  // Use ref to track previous values and avoid unnecessary updates
  const prevNoteRef = useRef<{ name: string; note_date: string | null }>({
    name: note.name,
    note_date: note.note_date
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  // Synchronize local state when note changes, but only when actual values change
  useEffect(() => {
    const prevNote = prevNoteRef.current
    const currentName = note.name
    const currentDate = note.note_date || note.created_at
    
    // Only update if the values have actually changed
    if (prevNote.name !== currentName || prevNote.note_date !== note.note_date) {
      console.log(' NoteHeader: Values changed, updating state')
      console.log('🔵 NoteHeader: Previous name:', prevNote.name, 'Current name:', currentName)
      console.log('🔵 NoteHeader: Previous date:', prevNote.note_date, 'Current date:', note.note_date)
      
      setDisplayName(currentName)
      setDisplayDate(currentDate)
      
      // Update the ref with current values
      prevNoteRef.current = {
        name: currentName,
        note_date: note.note_date
      }
    }
  }, [note.name, note.note_date, note.created_at])

  // Automatically clear success message after 5 seconds
  useEffect(() => {
    if (slackShareStatus?.type === 'success' && setSlackShareStatus) {
      const timer = setTimeout(() => setSlackShareStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [slackShareStatus, setSlackShareStatus])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes & Calls
        </button>
        
        <div className="flex items-center gap-2">
          {onShareToSlack && (
            <div className="relative inline-block">
              <button
                onClick={onShareToSlack}
                disabled={sharingToSlack || slackShareStatus?.type === 'success'}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-all disabled:opacity-50 ${
                  slackShareStatus?.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'text-green-600 hover:bg-green-50'
                }`}
              >
                {slackShareStatus?.type === 'success' ? (
                  <Check size={14} />
                ) : (
                  <Share size={14} />
                )}
                {slackShareStatus?.type === 'success' ? 'Shared successfully' : (sharingToSlack ? 'Sharing...' : 'Share to Slack')}
              </button>
              {slackShareStatus?.type === 'error' && (
                <div className="absolute top-full left-0 mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 min-w-max">
                  {slackShareStatus.message}
                </div>
              )}
            </div>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <Edit size={14} />
            Edit
          </button>
          <CopyLinkButton entityType="note" shortId={note.short_id} />
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{displayName}</h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(displayDate)}
            </div>
            
            {note.is_decision && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Decision
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}