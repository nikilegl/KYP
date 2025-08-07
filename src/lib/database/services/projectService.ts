import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Project } from '../../supabase'

export const getProjects = async (): Promise<Project[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      return stored ? JSON.parse(stored) : []
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}

export const getProjectByShortId = async (shortId: number): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('short_id', shortId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching project by short ID:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.short_id === shortId) || null
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return null
    }
  }
}

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.id === projectId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching project by ID:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.id === projectId) || null
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return null
    }
  }
}

export const createProject = async (name: string, overview?: string): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const projects = JSON.parse(localStorage.getItem('kyp_projects') || '[]')
      const nextShortId = Math.max(0, ...projects.map((p: Project) => p.short_id || 0)) + 1
      const newProject: Project = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        overview: overview || null,
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      projects.unshift(newProject)
      localStorage.setItem('kyp_projects', JSON.stringify(projects))
      return newProject
    } catch (error) {
      console.error('Error creating project locally:', error)
      return null
    }
  }

  try {
    // Get the workspace (assuming single workspace for now)
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        workspace_id: workspaces?.id || null,
        name,
        overview
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating project:', error)
    return null
  }
}

export const updateProject = async (projectId: string, updates: { name?: string; overview?: string }): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const projects = JSON.parse(localStorage.getItem('kyp_projects') || '[]')
      const updatedProjects = projects.map((project: Project) => 
        project.id === projectId 
          ? { ...project, ...updates, updated_at: new Date().toISOString() }
          : project
      )
      localStorage.setItem('kyp_projects', JSON.stringify(updatedProjects))
      
      const updatedProject = updatedProjects.find((p: Project) => p.id === projectId)
      return updatedProject || null
    } catch (error) {
      console.error('Error updating project locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating project:', error)
    return null
  }
}

export const deleteProject = async (projectId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const projects = JSON.parse(localStorage.getItem('kyp_projects') || '[]')
      const filteredProjects = projects.filter((project: Project) => project.id !== projectId)
      localStorage.setItem('kyp_projects', JSON.stringify(filteredProjects))
      return true
    } catch (error) {
      console.error('Error deleting project locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting project:', error)
    return false
  }
}

export const getProjectStakeholders = async (projectId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      return projectStakeholders
        .filter((ps: any) => ps.project_id === projectId)
        .map((ps: any) => ps.stakeholder_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select('stakeholder_id')
      .eq('project_id', projectId)

    if (error) throw error
    return data?.map(item => item.stakeholder_id) || []
  } catch (error) {
    console.error('Error fetching project stakeholders:', error)
    // Fallback to local storage if Supabase fetch fails
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      return projectStakeholders
        .filter((ps: any) => ps.project_id === projectId)
        .map((ps: any) => ps.stakeholder_id)
    } catch {
      return []
    }
  }
}

export const assignStakeholderToProject = async (projectId: string, stakeholderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      
      // Check if already assigned
      const exists = projectStakeholders.some((ps: any) => 
        ps.project_id === projectId && ps.stakeholder_id === stakeholderId
      )
      
      if (!exists) {
        projectStakeholders.push({
          id: `ps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          project_id: projectId,
          stakeholder_id: stakeholderId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_project_stakeholders', JSON.stringify(projectStakeholders))
      }
      
      return true
    } catch (error) {
      console.error('Error assigning stakeholder locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('project_stakeholders')
      .insert([{
        project_id: projectId,
        stakeholder_id: stakeholderId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error assigning stakeholder to project:', error)
    return false
  }
}

export const removeStakeholderFromProject = async (projectId: string, stakeholderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      const filtered = projectStakeholders.filter((ps: any) => 
        !(ps.project_id === projectId && ps.stakeholder_id === stakeholderId)
      )
      localStorage.setItem('kyp_project_stakeholders', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error removing stakeholder locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('project_stakeholders')
      .delete()
      .eq('project_id', projectId)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error removing stakeholder from project:', error)
    return false
  }
}

export const getProjectsForStakeholder = async (stakeholderId: string): Promise<Project[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const projectStakeholders = JSON.parse(localStorage.getItem('kyp_project_stakeholders') || '[]')
      const projects = JSON.parse(localStorage.getItem('kyp_projects') || '[]')
      
      const projectIds = projectStakeholders
        .filter((ps: any) => ps.stakeholder_id === stakeholderId)
        .map((ps: any) => ps.project_id)
      
      return projects.filter((project: Project) => projectIds.includes(project.id))
    } catch (error) {
      console.error('Error getting projects for stakeholder locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select(`
        projects (
          id,
          workspace_id,
          name,
          overview,
          created_at,
          updated_at
        )
      `)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    
    return data?.map(item => (item as any).projects).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting projects for stakeholder:', error)
    return []
  }
}