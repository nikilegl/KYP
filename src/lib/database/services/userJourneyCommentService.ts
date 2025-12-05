import { supabase, isSupabaseConfigured } from '../../supabase'

export interface UserJourneyComment {
  id: string
  user_journey_id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
}

export const getUserJourneyComments = async (userJourneyId: string): Promise<UserJourneyComment[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journey_comments')
      const comments = stored ? JSON.parse(stored) : []
      return comments.filter((comment: UserJourneyComment) => comment.user_journey_id === userJourneyId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_comments')
      .select('*')
      .eq('user_journey_id', userJourneyId)
      .order('created_at', { ascending: false })

    if (error) {
      // Handle 404 specifically (table doesn't exist)
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('user_journey_comments table does not exist yet. Comments feature will be unavailable.')
        return []
      }
      throw error
    }
    return data || []
  } catch (error: any) {
    // Silently handle 404 errors (table doesn't exist)
    if (error?.code === 'PGRST116' || error?.message?.includes('does not exist') || error?.status === 404) {
      return []
    }
    console.error('Error fetching user journey comments:', error)
    return []
  }
}

export const createUserJourneyComment = async (
  userJourneyId: string,
  commentText: string,
  userId: string
): Promise<UserJourneyComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_journey_comments') || '[]')
      const newComment: UserJourneyComment = {
        id: `ujc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_journey_id: userJourneyId,
        user_id: userId,
        comment_text: commentText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      comments.unshift(newComment)
      localStorage.setItem('kyp_user_journey_comments', JSON.stringify(comments))
      return newComment
    } catch (error) {
      console.error('Error creating user journey comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_comments')
      .insert([{
        user_journey_id: userJourneyId,
        user_id: userId,
        comment_text: commentText
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user journey comment:', error)
    return null
  }
}

export const updateUserJourneyComment = async (
  commentId: string,
  commentText: string
): Promise<UserJourneyComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_journey_comments') || '[]')
      const updatedComments = comments.map((comment: UserJourneyComment) => 
        comment.id === commentId 
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      localStorage.setItem('kyp_user_journey_comments', JSON.stringify(updatedComments))
      
      const updatedComment = updatedComments.find((c: UserJourneyComment) => c.id === commentId)
      return updatedComment || null
    } catch (error) {
      console.error('Error updating user journey comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_comments')
      .update({ comment_text: commentText, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user journey comment:', error)
    return null
  }
}

export const deleteUserJourneyComment = async (commentId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_journey_comments') || '[]')
      const filteredComments = comments.filter((comment: UserJourneyComment) => comment.id !== commentId)
      localStorage.setItem('kyp_user_journey_comments', JSON.stringify(filteredComments))
      return true
    } catch (error) {
      console.error('Error deleting user journey comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_journey_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user journey comment:', error)
    return false
  }
}


