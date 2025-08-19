import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ResearchNote, UserStory, Design, ResearchNoteComment } from '../../supabase'

export interface ProjectDecision {
  id: string
  content: string
  source_type: 'note' | 'user_story' | 'design'
  source_id: string
  source_name: string
  source_short_id?: number
  created_at: string
  updated_at?: string
  user_id?: string
}

export const getProjectDecisions = async (projectId: string): Promise<ProjectDecision[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const decisions: ProjectDecision[] = []
      
      // Get decisions from notes (research_note_comments where is_decision = true)
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]') as ResearchNote[]
      const noteComments = JSON.parse(localStorage.getItem('kyp_research_note_comments') || '[]') as ResearchNoteComment[]
      
      const projectNotes = notes.filter(note => note.project_id === projectId)
      
      projectNotes.forEach(note => {
        const noteDecisions = noteComments.filter(comment => 
          comment.research_note_id === note.id && comment.is_decision
        )
        
        noteDecisions.forEach(decision => {
          decisions.push({
            id: `note-${decision.id}`,
            content: decision.comment_text,
            source_type: 'note',
            source_id: note.id,
            source_name: note.name,
            source_short_id: note.short_id,
            created_at: decision.created_at,
            updated_at: decision.updated_at,
            user_id: decision.user_id
          })
        })
      })
      
      // Get decisions from user stories
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]') as UserStory[]
      const projectUserStories = userStories.filter(story => story.project_id === projectId)
      
      projectUserStories.forEach(story => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: decisionText,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: decisionText,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from design assets
      const designs = JSON.parse(localStorage.getItem('kyp_assets') || '[]') as Design[]
      const projectDesigns = designs.filter(design => design.project_id === projectId)
      
      projectDesigns.forEach(design => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: decisionText,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
      
      // Sort by created_at (newest first)
      return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error fetching decisions locally:', error)
      return []
    }
  }

  try {
    const decisions: ProjectDecision[] = []
    
    // Get decisions from notes (research_note_comments where is_decision = true)
    // Try to get decisions from notes (research_note_comments where is_decision = true)
    // Handle case where is_decision column might not exist yet
    try {
      const { data: noteDecisions, error: noteError } = await supabase
        .from('research_note_comments')
        .select(`
          *,
          research_notes!inner (
            id,
            name,
            short_id,
            project_id
          )
        `)
        .eq('research_notes.project_id', projectId)
        .eq('is_decision', true)
        .order('created_at', { ascending: false })

      if (noteError) throw noteError

      if (noteDecisions) {
        noteDecisions.forEach((decision: any) => {
          decisions.push({
            id: `note-${decision.id}`,
            content: decision.comment_text,
            source_type: 'note',
            source_id: decision.research_notes.id,
            source_name: decision.research_notes.name,
            source_short_id: decision.research_notes.short_id,
            created_at: decision.created_at,
            updated_at: decision.updated_at,
            user_id: decision.user_id
          })
        })
      }
    } catch (error: any) {
      // If the is_decision column doesn't exist, skip note decisions for now
      if (error.message?.includes('is_decision') || error.code === '42703') {
        console.warn('is_decision column not found in research_note_comments table. Skipping note decisions.')
      } else {
        throw error
      }
    }
    
    // Get decisions from user stories
    const { data: userStories, error: userStoryError } = await supabase
      .from('user_stories')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (userStoryError) throw userStoryError

    if (userStories) {
      userStories.forEach((story: UserStory) => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: decisionText,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: decisionText,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
    }
    
    // Get decisions from design assets
    const { data: designs, error: designError } = await supabase
      .from('designs')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (designError) throw designError

    if (designs) {
      designs.forEach((design: Design) => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: decisionText,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
    }
    
    // Sort by created_at (newest first)
    return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error('Error fetching project decisions:', error)
    return []
  }
}
