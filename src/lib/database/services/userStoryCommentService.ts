import { supabase, isSupabaseConfigured } from '../../supabase'
import type { UserStoryComment } from '../../supabase'

export const getUserStoryComments = async (userStoryId: string): Promise<UserStoryComment[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_story_comments')
      const comments = stored ? JSON.parse(stored) : []
      return comments.filter((comment: UserStoryComment) => comment.user_story_id === userStoryId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_story_comments')
      .select('*')
      .eq('user_story_id', userStoryId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user story comments:', error)
    return []
  }
}

export const createUserStoryComment = async (
  userStoryId: string,
  commentText: string,
  userId: string
): Promise<UserStoryComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_story_comments') || '[]')
      const newComment: UserStoryComment = {
        id: `usc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_story_id: userStoryId,
        user_id: userId,
        comment_text: commentText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      comments.unshift(newComment)
      localStorage.setItem('kyp_user_story_comments', JSON.stringify(comments))
      return newComment
    } catch (error) {
      console.error('Error creating user story comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_story_comments')
      .insert([{
        user_story_id: userStoryId,
        user_id: userId,
        comment_text: commentText
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user story comment:', error)
    return null
  }
}

export const updateUserStoryComment = async (
  commentId: string,
  commentText: string
): Promise<UserStoryComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_story_comments') || '[]')
      const updatedComments = comments.map((comment: UserStoryComment) => 
        comment.id === commentId 
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      localStorage.setItem('kyp_user_story_comments', JSON.stringify(updatedComments))
      
      const updatedComment = updatedComments.find((c: UserStoryComment) => c.id === commentId)
      return updatedComment || null
    } catch (error) {
      console.error('Error updating user story comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_story_comments')
      .update({ comment_text: commentText })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user story comment:', error)
    return null
  }
}

export const deleteUserStoryComment = async (commentId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const comments = JSON.parse(localStorage.getItem('kyp_user_story_comments') || '[]')
      const filteredComments = comments.filter((comment: UserStoryComment) => comment.id !== commentId)
      localStorage.setItem('kyp_user_story_comments', JSON.stringify(filteredComments))
      return true
    } catch (error) {
      console.error('Error deleting user story comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_story_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user story comment:', error)
    return false
  }
}