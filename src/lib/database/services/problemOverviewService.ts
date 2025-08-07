import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ProblemOverview } from '../../supabase'

export const getProblemOverview = async (projectId: string): Promise<ProblemOverview | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_problem_overviews')
      const problemOverviews = stored ? JSON.parse(stored) : []
      return problemOverviews.find((po: ProblemOverview) => po.project_id === projectId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('problem_overviews')
      .select('*')
      .eq('project_id', projectId)
      .limit(1)

    if (error) throw error
    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('Error fetching problem overview:', error)
    return null
  }
}

export const saveProblemOverview = async (
  problemOverview: Partial<ProblemOverview>
): Promise<ProblemOverview | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_problem_overviews')
      const problemOverviews = stored ? JSON.parse(stored) : []
      
      const existingIndex = problemOverviews.findIndex((po: ProblemOverview) => 
        po.project_id === problemOverview.project_id
      )
      
      const updatedProblemOverview: ProblemOverview = {
        id: problemOverview.id || (existingIndex >= 0 ? problemOverviews[existingIndex].id : `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
        project_id: problemOverview.project_id!,
        what_is_the_problem: problemOverview.what_is_the_problem || '',
        should_we_solve_it: problemOverview.should_we_solve_it || '',
        understanding_rating: problemOverview.understanding_rating || 5,
        risk_level: problemOverview.risk_level || 5,
        created_at: existingIndex >= 0 ? problemOverviews[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      if (existingIndex >= 0) {
        problemOverviews[existingIndex] = updatedProblemOverview
      } else {
        problemOverviews.push(updatedProblemOverview)
      }
      
      localStorage.setItem('kyp_problem_overviews', JSON.stringify(problemOverviews))
      return updatedProblemOverview
    } catch (error) {
      console.error('Error saving problem overview locally:', error)
      return null
    }
  }

  try {
    // Prepare the data for upsert
    const upsertData: any = {
      project_id: problemOverview.project_id,
      what_is_the_problem: problemOverview.what_is_the_problem || '',
      should_we_solve_it: problemOverview.should_we_solve_it || '',
      understanding_rating: problemOverview.understanding_rating || 5,
      risk_level: problemOverview.risk_level || 5
    }
    
    // Include id if it exists to ensure update instead of insert
    if (problemOverview.id) {
      upsertData.id = problemOverview.id
    }
    
    const { data: result, error } = await supabase
      .from('problem_overviews')
      .upsert([upsertData])
      .select()
      .single()

    if (error) throw error
    return result
  } catch (error) {
    console.error('Error saving problem overview:', error)
    return null
  }
}