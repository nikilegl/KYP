import { supabase, isSupabaseConfigured } from '../../supabase'
import type { UserJourney, UserJourneyNode, UserJourneyNodeAnswer } from '../../supabase'

export const getUserJourneys = async (projectId?: string): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journeys')
      const userJourneys = stored ? JSON.parse(stored) : []
      return projectId ? userJourneys.filter((uj: UserJourney) => uj.project_id === projectId) : userJourneys
    } catch {
      return []
    }
  }

  try {
    let query = supabase
      .from('user_journeys')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user journeys:', error)
    return []
  }
}

export const getUserJourneyByShortId = async (shortId: number): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journeys')
      const journeys = stored ? JSON.parse(stored) : []
      return journeys.find((journey: UserJourney) => journey.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user journey by short ID:', error)
    return null
  }
}

export const createUserJourney = async (projectId: string, name: string, stakeholderIds: string[] = []): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userJourneys = JSON.parse(localStorage.getItem('kyp_user_journeys') || '[]')
      const nextShortId = Math.max(0, ...userJourneys.map((j: UserJourney) => j.short_id || 0)) + 1
      const newJourney: UserJourney = {
        id: `uj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      userJourneys.unshift(newJourney)
      localStorage.setItem('kyp_user_journeys', JSON.stringify(userJourneys))
      
      // Store stakeholder associations
      if (stakeholderIds.length > 0) {
        const journeyStakeholders = JSON.parse(localStorage.getItem('kyp_user_journey_stakeholders') || '[]')
        stakeholderIds.forEach(stakeholderId => {
          journeyStakeholders.push({
            id: `ujs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_journey_id: newJourney.id,
            stakeholder_id: stakeholderId,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_user_journey_stakeholders', JSON.stringify(journeyStakeholders))
      }
      
      return newJourney
    } catch (error) {
      console.error('Error creating user journey locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .insert([{
        project_id: projectId,
        name
      }])
      .select()
      .single()

    if (error) throw error

    // Create stakeholder associations
    if (stakeholderIds.length > 0) {
      const stakeholderInserts = stakeholderIds.map(stakeholderId => ({
        user_journey_id: data.id,
        stakeholder_id: stakeholderId
      }))

      await supabase
        .from('user_journey_stakeholders')
        .insert(stakeholderInserts)
    }

    return data
  } catch (error) {
    console.error('Error creating user journey:', error)
    return null
  }
}

export const updateUserJourney = async (
  journeyId: string, 
  updates: { name?: string },
  stakeholderIds?: string[]
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userJourneys = JSON.parse(localStorage.getItem('kyp_user_journeys') || '[]')
      const updatedJourneys = userJourneys.map((journey: UserJourney) => 
        journey.id === journeyId 
          ? { ...journey, ...updates, updated_at: new Date().toISOString() }
          : journey
      )
      localStorage.setItem('kyp_user_journeys', JSON.stringify(updatedJourneys))
      
      // Update stakeholder associations if provided
      if (stakeholderIds !== undefined) {
        const journeyStakeholders = JSON.parse(localStorage.getItem('kyp_user_journey_stakeholders') || '[]')
        const filteredStakeholders = journeyStakeholders.filter((js: any) => js.user_journey_id !== journeyId)
        
        stakeholderIds.forEach(stakeholderId => {
          filteredStakeholders.push({
            id: `ujs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_journey_id: journeyId,
            stakeholder_id: stakeholderId,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_user_journey_stakeholders', JSON.stringify(filteredStakeholders))
      }
      
      const updatedJourney = updatedJourneys.find((j: UserJourney) => j.id === journeyId)
      return updatedJourney || null
    } catch (error) {
      console.error('Error updating user journey locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .update(updates)
      .eq('id', journeyId)
      .select()
      .single()

    if (error) throw error

    // Update stakeholder associations if provided
    if (stakeholderIds !== undefined) {
      // Delete existing associations
      await supabase
        .from('user_journey_stakeholders')
        .delete()
        .eq('user_journey_id', journeyId)

      // Create new associations
      if (stakeholderIds.length > 0) {
        const stakeholderInserts = stakeholderIds.map(stakeholderId => ({
          user_journey_id: journeyId,
          stakeholder_id: stakeholderId
        }))

        await supabase
          .from('user_journey_stakeholders')
          .insert(stakeholderInserts)
      }
    }

    // Update theme associations if provided
    if (themeIds !== undefined) {
      // Delete existing theme associations
      await supabase
        .from('theme_user_journeys')
        .delete()
        .eq('user_journey_id', journeyId)

      // Create new theme associations
      if (themeIds.length > 0) {
        const themeInserts = themeIds.map(themeId => ({
          theme_id: themeId,
          user_journey_id: journeyId
        }))

        await supabase
          .from('theme_user_journeys')
          .insert(themeInserts)
      }
    }

    return data
  } catch (error) {
    console.error('Error updating user journey:', error)
    return null
  }
}

export const deleteUserJourney = async (journeyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userJourneys = JSON.parse(localStorage.getItem('kyp_user_journeys') || '[]')
      const filteredJourneys = userJourneys.filter((journey: UserJourney) => journey.id !== journeyId)
      localStorage.setItem('kyp_user_journeys', JSON.stringify(filteredJourneys))
      
      // Also remove stakeholder associations
      const journeyStakeholders = JSON.parse(localStorage.getItem('kyp_user_journey_stakeholders') || '[]')
      const filteredStakeholders = journeyStakeholders.filter((js: any) => js.user_journey_id !== journeyId)
      localStorage.setItem('kyp_user_journey_stakeholders', JSON.stringify(filteredStakeholders))
      
      // Also remove nodes
      const journeyNodes = JSON.parse(localStorage.getItem('kyp_user_journey_nodes') || '[]')
      const filteredNodes = journeyNodes.filter((jn: any) => jn.user_journey_id !== journeyId)
      localStorage.setItem('kyp_user_journey_nodes', JSON.stringify(filteredNodes))
      
      return true
    } catch (error) {
      console.error('Error deleting user journey locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_journeys')
      .delete()
      .eq('id', journeyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user journey:', error)
    return false
  }
}

export const getUserJourneyStakeholders = async (journeyId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journey_stakeholders')
      const journeyStakeholders = stored ? JSON.parse(stored) : []
      return journeyStakeholders
        .filter((js: any) => js.user_journey_id === journeyId)
        .map((js: any) => js.stakeholder_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_stakeholders')
      .select('stakeholder_id')
      .eq('user_journey_id', journeyId)

    if (error) throw error
    return data?.map(item => item.stakeholder_id) || []
  } catch (error) {
    console.error('Error fetching user journey stakeholders:', error)
    return []
  }
}

export const getUserJourneysForStakeholder = async (stakeholderId: string): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const journeyStakeholders = JSON.parse(localStorage.getItem('kyp_user_journey_stakeholders') || '[]')
      const userJourneys = JSON.parse(localStorage.getItem('kyp_user_journeys') || '[]')
      
      const journeyIds = journeyStakeholders
        .filter((js: any) => js.stakeholder_id === stakeholderId)
        .map((js: any) => js.user_journey_id)
      
      return userJourneys.filter((journey: UserJourney) => journeyIds.includes(journey.id))
    } catch (error) {
      console.error('Error getting user journeys for stakeholder locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_stakeholders')
      .select(`
        user_journeys (
          id,
          project_id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    
    return data?.map(item => (item as any).user_journeys).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting user journeys for stakeholder:', error)
    return []
  }
}

export const getUserJourneyNodes = async (journeyId: string): Promise<UserJourneyNode[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journey_nodes')
      const journeyNodes = stored ? JSON.parse(stored) : []
      return journeyNodes.filter((jn: UserJourneyNode) => jn.user_journey_id === journeyId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_nodes')
      .select('*')
      .eq('user_journey_id', journeyId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user journey nodes:', error)
    return []
  }
}

export const createUserJourneyNode = async (
  journeyId: string,
  type: 'task' | 'question',
  description: string,
  parentNodeId?: string,
  parentAnswer?: string,
  painPoint?: string,
  answers?: string[]
): Promise<UserJourneyNode | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const journeyNodes = JSON.parse(localStorage.getItem('kyp_user_journey_nodes') || '[]')
      const newNode: UserJourneyNode = {
        id: `ujn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_journey_id: journeyId,
        type,
        description,
        parent_node_id: parentNodeId || null,
        parent_answer: parentAnswer || null,
        pain_point: painPoint || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      journeyNodes.push(newNode)
      localStorage.setItem('kyp_user_journey_nodes', JSON.stringify(journeyNodes))
      
      // Store answers if provided
      if (answers && answers.length > 0) {
        const nodeAnswers = JSON.parse(localStorage.getItem('kyp_user_journey_node_answers') || '[]')
        answers.forEach(answer => {
          nodeAnswers.push({
            id: `ujna-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            node_id: newNode.id,
            answer_text: answer,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_user_journey_node_answers', JSON.stringify(nodeAnswers))
      }
      
      return newNode
    } catch (error) {
      console.error('Error creating user journey node locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_nodes')
      .insert([{
        user_journey_id: journeyId,
        type,
        description,
        parent_node_id: parentNodeId,
        parent_answer: parentAnswer,
        pain_point: painPoint
      }])
      .select()
      .single()

    if (error) throw error

    // Create answers if provided
    if (answers && answers.length > 0) {
      const answerInserts = answers.map(answer => ({
        node_id: data.id,
        answer_text: answer
      }))

      await supabase
        .from('user_journey_node_answers')
        .insert(answerInserts)
    }

    return data
  } catch (error) {
    console.error('Error creating user journey node:', error)
    return null
  }
}

export const updateUserJourneyNode = async (
  nodeId: string,
  updates: {
    type?: 'task' | 'question'
    description?: string
    parent_node_id?: string | null
    parent_answer?: string | null
    pain_point?: string | null
  },
  answers?: string[]
): Promise<UserJourneyNode | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const journeyNodes = JSON.parse(localStorage.getItem('kyp_user_journey_nodes') || '[]')
      const updatedNodes = journeyNodes.map((node: UserJourneyNode) => 
        node.id === nodeId 
          ? { ...node, ...updates, updated_at: new Date().toISOString() }
          : node
      )
      localStorage.setItem('kyp_user_journey_nodes', JSON.stringify(updatedNodes))
      
      // Update answers if provided
      if (answers !== undefined) {
        const nodeAnswers = JSON.parse(localStorage.getItem('kyp_user_journey_node_answers') || '[]')
        const filteredAnswers = nodeAnswers.filter((na: any) => na.node_id !== nodeId)
        
        answers.forEach(answer => {
          filteredAnswers.push({
            id: `ujna-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            node_id: nodeId,
            answer_text: answer,
            created_at: new Date().toISOString()
          })
        })
        
        localStorage.setItem('kyp_user_journey_node_answers', JSON.stringify(filteredAnswers))
      }
      
      const updatedNode = updatedNodes.find((n: UserJourneyNode) => n.id === nodeId)
      return updatedNode || null
    } catch (error) {
      console.error('Error updating user journey node locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single()

    if (error) throw error

    // Update answers if provided
    if (answers !== undefined) {
      // Delete existing answers
      await supabase
        .from('user_journey_node_answers')
        .delete()
        .eq('node_id', nodeId)

      // Create new answers
      if (answers.length > 0) {
        const answerInserts = answers.map(answer => ({
          node_id: nodeId,
          answer_text: answer
        }))

        await supabase
          .from('user_journey_node_answers')
          .insert(answerInserts)
      }
    }

    return data
  } catch (error) {
    console.error('Error updating user journey node:', error)
    return null
  }
}

export const deleteUserJourneyNode = async (nodeId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const journeyNodes = JSON.parse(localStorage.getItem('kyp_user_journey_nodes') || '[]')
      const filteredNodes = journeyNodes.filter((node: UserJourneyNode) => node.id !== nodeId)
      localStorage.setItem('kyp_user_journey_nodes', JSON.stringify(filteredNodes))
      
      // Also remove answers
      const nodeAnswers = JSON.parse(localStorage.getItem('kyp_user_journey_node_answers') || '[]')
      const filteredAnswers = nodeAnswers.filter((na: any) => na.node_id !== nodeId)
      localStorage.setItem('kyp_user_journey_node_answers', JSON.stringify(filteredAnswers))
      
      return true
    } catch (error) {
      console.error('Error deleting user journey node locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_journey_nodes')
      .delete()
      .eq('id', nodeId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user journey node:', error)
    return false
  }
}

export const getNodeAnswers = async (nodeId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_journey_node_answers')
      const nodeAnswers = stored ? JSON.parse(stored) : []
      return nodeAnswers
        .filter((na: any) => na.node_id === nodeId)
        .map((na: any) => na.answer_text)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journey_node_answers')
      .select('answer_text')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data?.map(item => item.answer_text) || []
  } catch (error) {
    console.error('Error fetching node answers:', error)
    return []
  }
}

export const getUserJourneysByThemeId = async (themeId: string): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeUserJourneys = JSON.parse(localStorage.getItem('kyp_theme_user_journeys') || '[]')
      const userJourneys = JSON.parse(localStorage.getItem('kyp_user_journeys') || '[]')
      
      const userJourneyIds = themeUserJourneys
        .filter((tuj: any) => tuj.theme_id === themeId)
        .map((tuj: any) => tuj.user_journey_id)
      
      return userJourneys.filter((journey: UserJourney) => userJourneyIds.includes(journey.id))
    } catch (error) {
      console.error('Error getting user journeys by theme ID locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_user_journeys')
      .select(`
        user_journeys (
          id,
          project_id,
          name,
          short_id,
          created_at,
          updated_at
        )
      `)
      .eq('theme_id', themeId)

    if (error) throw error
    
    return data?.map(item => (item as any).user_journeys).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting user journeys by theme ID:', error)
    return []
  }
}