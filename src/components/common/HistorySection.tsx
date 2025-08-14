import React, { useState } from 'react'
import { MessageSquare, Plus, Save, X, Edit, Trash2, CheckCircle, Clock } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { WorkspaceUser } from '../../lib/supabase'

// Generic comment interface that can be used for any entity
export interface Comment {
  id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
}

// Audit history entry interface
export interface AuditEntry {
  id: string
  action: string
  user_id: string
  created_at: string
  details?: string
}

interface HistorySectionProps {
  entityId: string
  entityType: string // e.g., 'user story', 'design', 'note', etc.
  comments: Comment[]
  decisions?: string[]
  auditHistory?: AuditEntry[]
  user: User | null
  allUsers: WorkspaceUser[]
  showHistory: boolean
  onAddComment: (commentText: string) => Promise<void>
  onEditComment: (commentId: string, commentText: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onAddDecision?: (decisionText: string) => Promise<void>
  onEditDecision?: (decisionIndex: number, decisionText: string) => Promise<void>
  onDeleteDecision?: (decisionIndex: number) => Promise<void>
  saving: boolean
  className?: string
}

export function HistorySection({
  entityId,
  entityType,
  comments,
  decisions = [],
  auditHistory = [],
  user,
  allUsers,
  showHistory,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddDecision,
  onEditDecision,
  onDeleteDecision,
  saving,
  className = ''
}: HistorySectionProps) {
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [editingDecisionIndex, setEditingDecisionIndex] = useState<number | null>(null)
  const [editingDecisionText, setEditingDecisionText] = useState('')
  const [isDecision, setIsDecision] = useState(false)

  // Ensure comments is always an array
  const safeComments = comments || []

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return
    
    try {
      if (isDecision && onAddDecision) {
        await onAddDecision(newComment.trim())
      } else {
        await onAddComment(newComment.trim())
      }
      setNewComment('')
      setIsDecision(false)
    } catch (error) {
      console.error('Error adding comment/decision:', error)
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment_text)
  }

  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return
    
    try {
      await onEditComment(editingCommentId, editingCommentText.trim())
      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    
    try {
      await onDeleteComment(commentId)
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleEditDecision = (decisionIndex: number, decisionText: string) => {
    setEditingDecisionIndex(decisionIndex)
    // Extract plain text if it has timestamp format
    const timestampMatch = decisionText.match(/^(.+?)\|(.+)$/)
    const plainText = timestampMatch ? timestampMatch[2] : decisionText
    setEditingDecisionText(plainText)
  }

  const handleSaveEditDecision = async () => {
    if (editingDecisionIndex === null || !editingDecisionText.trim() || !onEditDecision) return
    
    try {
      // Pass only the plain text to the parent component
      await onEditDecision(editingDecisionIndex, editingDecisionText.trim())
      setEditingDecisionIndex(null)
      setEditingDecisionText('')
    } catch (error) {
      console.error('Error updating decision:', error)
    }
  }

  const handleDeleteDecision = async (decisionIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this decision?') || !onDeleteDecision) return
    
    try {
      await onDeleteDecision(decisionIndex)
    } catch (error) {
      console.error('Error deleting decision:', error)
    }
  }

  const getCommentAuthor = (userId: string) => {
    const author = allUsers.find(u => u.user_id === userId)
    return author ? (author.full_name || author.user_email) : 'Unknown User'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Simple approach: Create stable timestamps for decisions based on their array index
  // Since decisions don't have real timestamps from the database, we'll create them
  // New decisions get current timestamp, existing ones get stable calculated timestamps

  // First, create all history items
  const auditItems = auditHistory.map(entry => ({
    id: entry.id,
    type: 'audit' as const,
    action: entry.action,
    user_id: entry.user_id,
    created_at: entry.created_at,
    details: entry.details,
    sortOrder: new Date(entry.created_at).getTime()
  }))

  // For decisions, parse timestamps from the decision strings (format: "timestamp|text")
  // If no timestamp exists, use current time (for backwards compatibility)
  const decisionItems = React.useMemo(() => {
    return decisions.map((decision, index) => {
      let decisionTimestamp: number
      let decisionText: string
      
      // Check if decision has timestamp format: "2024-01-01T12:00:00.000Z|Decision text"
      const timestampMatch = decision.match(/^(.+?)\|(.+)$/)
      if (timestampMatch) {
        // Decision has timestamp - use it
        const [, timestampStr, text] = timestampMatch
        decisionTimestamp = new Date(timestampStr).getTime()
        decisionText = text
      } else {
        // Plain text decision - create a stable timestamp based on position
        const minutesAgo = 1 + (decisions.length - 1 - index) * 5
        decisionTimestamp = Date.now() - (minutesAgo * 60 * 1000)
        decisionText = decision
      }
      
      return {
        id: `decision-${index}`,
        type: 'decision' as const,
        action: 'Decision recorded',
        user_id: user?.id || 'system',
        created_at: new Date(decisionTimestamp).toISOString(),
        details: decisionText,
        decisionIndex: index,
        sortOrder: decisionTimestamp
      }
    })
  }, [decisions, user?.id]) // Only recalculate when decisions array changes or user changes

  const commentItems = safeComments.map(comment => ({
    id: comment.id,
    type: 'comment' as const,
    action: 'Comment added',
    user_id: comment.user_id,
    created_at: comment.created_at,
    details: comment.comment_text,
    sortOrder: new Date(comment.created_at).getTime()
  }))

  // Combine all items and sort by sortOrder
  const allHistoryItems = [...auditItems, ...decisionItems, ...commentItems]
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .map(item => ({
      id: item.id,
      type: item.type,
      action: item.action,
      user_id: item.user_id,
      created_at: item.created_at,
      details: item.details,
      decisionIndex: (item as any).decisionIndex // Include decisionIndex for decision items
    }))

  const renderHistoryItem = (item: any) => {
    const { date, time } = formatDateTime(item.created_at)
    
    return (
      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
        {/* Header row with icon, action title, and Edit/Delete buttons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Icon */}
            {item.type === 'audit' && <Clock className="w-4 h-4 text-blue-600" />}
            {item.type === 'decision' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {item.type === 'comment' && <MessageSquare className="w-4 h-4 text-gray-600" />}
            
            {/* Action title */}
            <h4 className="text-sm font-medium text-gray-900">{item.action}</h4>
          </div>
          
          {/* Edit/Delete buttons */}
          {((item.type === 'comment' && user && item.user_id === user.id) || 
            (item.type === 'decision' && user && item.user_id === user.id)) && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (item.type === 'comment') {
                    setEditingCommentId(item.id)
                    setEditingCommentText(item.details)
                  } else if (item.type === 'decision') {
                    handleEditDecision(item.decisionIndex, item.details)
                  }
                }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                title={item.type === 'comment' ? 'Edit comment' : 'Edit decision'}
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => {
                  if (item.type === 'comment') {
                    handleDeleteComment(item.id)
                  } else if (item.type === 'decision') {
                    handleDeleteDecision(item.decisionIndex)
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                title={item.type === 'comment' ? 'Delete comment' : 'Delete decision'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Content section */}
        {item.details && (
          <div className={`text-sm mb-3 ${
            item.type === 'decision' 
              ? 'text-green-800 bg-green-50 p-2 rounded border border-green-200' 
              : 'text-gray-700'
          }`}>
            {item.type === 'decision' && editingDecisionIndex === item.decisionIndex ? (
              // Editing mode for decisions
              <div className="space-y-2">
                <textarea
                  value={editingDecisionText}
                  onChange={(e) => setEditingDecisionText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Edit decision..."
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEditDecision}
                    disabled={!editingDecisionText.trim()}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={12} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDecisionIndex(null)
                      setEditingDecisionText('')
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : item.type === 'comment' && editingCommentId === item.id ? (
              // Editing mode for comments
              <div className="space-y-3">
                <textarea
                  value={editingCommentText}
                  onChange={(e) => setEditingCommentText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={saving}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEditComment}
                    disabled={saving || !editingCommentText.trim()}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCommentId(null)
                      setEditingCommentText('')
                    }}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              item.details
            )}
          </div>
        )}

        {/* Author and timestamp */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <p className="font-medium text-gray-700">{getCommentAuthor(item.user_id)}</p>
          <p>{date} at {time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out border-l border-gray-200 bg-white ${
      showHistory ? 'w-96' : 'w-0'
    } ${className}`}>
      {showHistory && (
        <div className="w-96 overflow-hidden">
          <div className="bg-white p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                History ({allHistoryItems.length})
              </h3>
            </div>

            {/* Add Comment/Decision */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add a comment or decision..."
                disabled={saving}
              />
              
              {/* Toggle for decision */}
              {onAddDecision && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isDecision}
                      onChange={(e) => setIsDecision(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Record as decision
                  </label>
                </div>
              )}
              
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={saving || !newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={16} />
                  {saving ? 'Adding...' : isDecision ? 'Add Decision' : 'Add Comment'}
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-4 h-full overflow-y-auto">
              {allHistoryItems.length > 0 ? (
                allHistoryItems.map((item) => renderHistoryItem(item))
              ) : (
                <div className="text-center py-8">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No history yet. Add a comment to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 