import { supabase, isSupabaseConfigured } from '../../supabase'

export interface ResearchNoteComment {
  id: string
  research_note_id: string
  user_id: string
  comment_text: string
  is_decision: boolean
  created_at: string
  updated_at: string
}

export const getResearchNoteComments = async (researchNoteId: string): Promise<ResearchNoteComment[]> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase || true) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_note_comments')
      const allComments = stored ? JSON.parse(stored) : []
      const filteredComments = allComments.filter((comment: ResearchNoteComment) => comment.research_note_id === researchNoteId)
      return filteredComments
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_comments')
      .select('*')
      .eq('research_note_id', researchNoteId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching research note comments from Supabase:', error)
    return []
  }
}

export const createResearchNoteComment = async (
  researchNoteId: string,
  commentText: string,
  userId: string,
  isDecision: boolean = false
): Promise<ResearchNoteComment | null> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase || true) {
    // Local storage fallback
    try {
      const newComment: ResearchNoteComment = {
        id: `rnc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        research_note_id: researchNoteId,
        user_id: userId,
        comment_text: commentText,
        is_decision: isDecision,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const stored = localStorage.getItem('kyp_research_note_comments')
      const comments = stored ? JSON.parse(stored) : []
      comments.push(newComment)
      localStorage.setItem('kyp_research_note_comments', JSON.stringify(comments))
      
      return newComment
    } catch (error) {
      console.error('Error creating research note comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_comments')
      .insert([{
        research_note_id: researchNoteId,
        user_id: userId,
        comment_text: commentText,
        is_decision: isDecision
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating research note comment:', error)
    return null
  }
}

export const updateResearchNoteComment = async (
  commentId: string,
  commentText: string
): Promise<ResearchNoteComment | null> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase || true) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_note_comments')
      const comments = stored ? JSON.parse(stored) : []
      const updatedComments = comments.map((comment: ResearchNoteComment) =>
        comment.id === commentId
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      localStorage.setItem('kyp_research_note_comments', JSON.stringify(updatedComments))
      
      return updatedComments.find((c: ResearchNoteComment) => c.id === commentId) || null
    } catch (error) {
      console.error('Error updating research note comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_comments')
      .update({ 
        comment_text: commentText, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating research note comment:', error)
    return null
  }
}

export const deleteResearchNoteComment = async (commentId: string): Promise<boolean> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase || true) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_note_comments')
      const comments = stored ? JSON.parse(stored) : []
      const filteredComments = comments.filter((comment: ResearchNoteComment) => comment.id !== commentId)
      localStorage.setItem('kyp_research_note_comments', JSON.stringify(filteredComments))
      
      return true
    } catch (error) {
      console.error('Error deleting research note comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('research_note_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting research note comment:', error)
    return false
  }
}
