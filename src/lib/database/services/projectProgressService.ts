import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ProjectProgressStatus, ProjectProgressComment } from '../../supabase'

// Question keys for the project progress form
export const PROGRESS_QUESTIONS = {
  PROBLEM_DEFINITION: 'problem_definition',
  CENTRALISED_DECENTRALISED: 'centralised_decentralised',
  USER_ROLES: 'user_roles',
  CORE_JOURNEYS: 'core_journeys',
  PENDO_TRACKING: 'pendo_tracking',
  INTERNAL_STAKEHOLDERS: 'internal_stakeholders',
  DESIGNS_ASSETS: 'designs_assets',
  FIGMA_LIBRARY: 'figma_library',
  OUTSTANDING_TASKS: 'outstanding_tasks'
} as const

export type ProgressQuestionKey = typeof PROGRESS_QUESTIONS[keyof typeof PROGRESS_QUESTIONS]

export const getProjectProgressStatus = async (projectId: string): Promise<ProjectProgressStatus[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_status')
      const allStatus = stored ? JSON.parse(stored) : []
      return allStatus.filter((status: ProjectProgressStatus) => status.project_id === projectId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_status')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching project progress status:', error)
    return []
  }
}

export const updateProjectProgressStatus = async (
  projectId: string,
  questionKey: ProgressQuestionKey,
  isCompleted: boolean
): Promise<ProjectProgressStatus | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_status')
      const allStatus = stored ? JSON.parse(stored) : []
      
      const existingIndex = allStatus.findIndex((status: ProjectProgressStatus) => 
        status.project_id === projectId && status.question_key === questionKey
      )
      
      const updatedStatus: ProjectProgressStatus = {
        id: existingIndex >= 0 ? allStatus[existingIndex].id : `pps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        question_key: questionKey,
        is_completed: isCompleted,
        created_at: existingIndex >= 0 ? allStatus[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      if (existingIndex >= 0) {
        allStatus[existingIndex] = updatedStatus
      } else {
        allStatus.push(updatedStatus)
      }
      
      localStorage.setItem('kyp_project_progress_status', JSON.stringify(allStatus))
      return updatedStatus
    } catch (error) {
      console.error('Error updating project progress status locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_status')
      .upsert({
        project_id: projectId,
        question_key: questionKey,
        is_completed: isCompleted
      }, {
        onConflict: 'project_id,question_key'
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating project progress status:', error)
    return null
  }
}

export const getProjectProgressComments = async (
  projectId: string,
  questionKey: ProgressQuestionKey
): Promise<ProjectProgressComment[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_comments')
      const allComments = stored ? JSON.parse(stored) : []
      return allComments.filter((comment: ProjectProgressComment) => 
        comment.project_id === projectId && comment.question_key === questionKey
      )
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_comments')
      .select('*')
      .eq('project_id', projectId)
      .eq('question_key', questionKey)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching project progress comments:', error)
    return []
  }
}

export const createProjectProgressComment = async (
  projectId: string,
  questionKey: ProgressQuestionKey,
  commentText: string,
  userId: string
): Promise<ProjectProgressComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_comments')
      const allComments = stored ? JSON.parse(stored) : []
      
      const newComment: ProjectProgressComment = {
        id: `ppc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        question_key: questionKey,
        user_id: userId,
        comment_text: commentText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      allComments.push(newComment)
      localStorage.setItem('kyp_project_progress_comments', JSON.stringify(allComments))
      return newComment
    } catch (error) {
      console.error('Error creating project progress comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_comments')
      .insert([{
        project_id: projectId,
        question_key: questionKey,
        user_id: userId,
        comment_text: commentText
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating project progress comment:', error)
    return null
  }
}

export const updateProjectProgressComment = async (
  commentId: string,
  commentText: string
): Promise<ProjectProgressComment | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_comments')
      const allComments = stored ? JSON.parse(stored) : []
      
      const updatedComments = allComments.map((comment: ProjectProgressComment) => 
        comment.id === commentId 
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      
      localStorage.setItem('kyp_project_progress_comments', JSON.stringify(updatedComments))
      
      const updatedComment = updatedComments.find((c: ProjectProgressComment) => c.id === commentId)
      return updatedComment || null
    } catch (error) {
      console.error('Error updating project progress comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_comments')
      .update({ comment_text: commentText })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating project progress comment:', error)
    return null
  }
}

export const deleteProjectProgressComment = async (commentId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_comments')
      const allComments = stored ? JSON.parse(stored) : []
      
      const filteredComments = allComments.filter((comment: ProjectProgressComment) => comment.id !== commentId)
      localStorage.setItem('kyp_project_progress_comments', JSON.stringify(filteredComments))
      return true
    } catch (error) {
      console.error('Error deleting project progress comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('project_progress_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting project progress comment:', error)
    return false
  }
}

export const getAllProjectProgressStatus = async (): Promise<ProjectProgressStatus[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_progress_status')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_progress_status')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching all project progress status:', error)
    return []
  }
}