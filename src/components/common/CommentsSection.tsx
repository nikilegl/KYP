import React, { useState } from 'react'
import { MessageSquare, Plus, Save, X, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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

interface CommentsSectionProps {
  entityId: string
  entityType: string // e.g., 'user story', 'design', 'note', etc.
  comments: Comment[]
  user: User | null
  allUsers: WorkspaceUser[]
  showComments: boolean
  onAddComment: (commentText: string) => Promise<void>
  onEditComment: (commentId: string, commentText: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  saving: boolean
  className?: string
}

export function CommentsSection({
  entityId,
  entityType,
  comments,
  user,
  allUsers,
  showComments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  saving,
  className = ''
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  // Ensure comments is always an array
  const safeComments = comments || []

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return
    
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
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

  const getCommentAuthor = (userId: string) => {
    const author = allUsers.find(u => u.user_id === userId)
    return author ? (author.full_name || author.user_email) : 'Unknown User'
  }

  return (
    <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out border-l border-gray-200 bg-white ${
      showComments ? 'w-96' : 'w-0'
    } ${className}`}>
      {showComments && (
        <div className="w-96 overflow-hidden">
          <div className="bg-white p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Comments ({safeComments.length})
              </h3>
            </div>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add a comment..."
                disabled={saving}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={saving || !newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={16} />
                  {saving ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4 h-full overflow-y-auto">
              {safeComments.length > 0 ? (
                safeComments.map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    {editingCommentId === comment.id ? (
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
                      <div>
                        <p className="text-gray-900 mb-2">{comment.comment_text}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            <p className="font-medium text-gray-700">{getCommentAuthor(comment.user_id)}</p>
                            <p>
                              {new Date(comment.created_at).toLocaleDateString()} at{' '}
                              {new Date(comment.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          {user && comment.user_id === user.id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                title="Edit comment"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No comments yet. Be the first to add a comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}