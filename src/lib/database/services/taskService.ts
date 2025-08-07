import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Task } from '../../supabase'

export const getTasks = async (projectId?: string, researchNoteId?: string, userStoryId?: string): Promise<Task[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_tasks')
      const tasks = stored ? JSON.parse(stored) : []
      let filteredTasks = tasks
      if (projectId) {
        filteredTasks = filteredTasks.filter((task: Task) => task.project_id === projectId)
      }
      if (researchNoteId) {
        filteredTasks = filteredTasks.filter((task: Task) => task.research_note_id === researchNoteId)
      }
      if (userStoryId) {
        filteredTasks = filteredTasks.filter((task: Task) => task.user_story_id === userStoryId)
      }
      return filteredTasks
    } catch {
      return []
    }
  }

  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    
    if (researchNoteId) {
      query = query.eq('research_note_id', researchNoteId)
    }
    
    if (userStoryId) {
      query = query.eq('user_story_id', userStoryId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export const createTask = async (
  projectId: string,
  name: string,
  description?: string,
  status: 'not_complete' | 'complete' | 'no_longer_required' = 'not_complete',
  assignedToUserId?: string,
  researchNoteId?: string,
  userStoryId?: string
): Promise<Task | null> => {
  console.log('createTask called with:', { projectId, name, description, status, assignedToUserId, researchNoteId, userStoryId })
  
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const tasks = JSON.parse(localStorage.getItem('kyp_tasks') || '[]')
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        description: description || null,
        status,
        assigned_to_user_id: assignedToUserId || null,
        research_note_id: researchNoteId || null,
        user_story_id: userStoryId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      tasks.unshift(newTask)
      localStorage.setItem('kyp_tasks', JSON.stringify(tasks))
      console.log('Task created locally:', newTask)
      return newTask
    } catch (error) {
      console.error('Error creating task locally:', error)
      return null
    }
  }

  try {
    console.log('Creating task in Supabase with data:', {
      project_id: projectId,
      name,
      description,
      status,
      assigned_to_user_id: assignedToUserId,
      research_note_id: researchNoteId,
      user_story_id: userStoryId
    })
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        project_id: projectId,
        name,
        description,
        status,
        assigned_to_user_id: assignedToUserId,
        research_note_id: researchNoteId,
        user_story_id: userStoryId
      }])
      .select()
      .single()

    if (error) throw error
    console.log('Task created successfully in Supabase:', data)
    return data
  } catch (error) {
    console.error('Error creating task:', error)
    console.error('Full error details:', error)
    return null
  }
}

export const updateTask = async (
  taskId: string,
  updates: {
    name?: string
    description?: string
    status?: 'not_complete' | 'complete' | 'no_longer_required'
    assigned_to_user_id?: string
    project_id?: string
    user_story_id?: string
  }
): Promise<Task | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const tasks = JSON.parse(localStorage.getItem('kyp_tasks') || '[]')
      const updatedTasks = tasks.map((task: Task) => 
        task.id === taskId 
          ? { ...task, ...updates, updated_at: new Date().toISOString() }
          : task
      )
      localStorage.setItem('kyp_tasks', JSON.stringify(updatedTasks))
      
      const updatedTask = updatedTasks.find((t: Task) => t.id === taskId)
      return updatedTask || null
    } catch (error) {
      console.error('Error updating task locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating task:', error)
    return null
  }
}

export const deleteTask = async (taskId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const tasks = JSON.parse(localStorage.getItem('kyp_tasks') || '[]')
      const filteredTasks = tasks.filter((task: Task) => task.id !== taskId)
      localStorage.setItem('kyp_tasks', JSON.stringify(filteredTasks))
      return true
    } catch (error) {
      console.error('Error deleting task locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting task:', error)
    return false
  }
}