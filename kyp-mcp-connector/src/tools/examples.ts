import { z } from 'zod'
import { supabase, isSupabaseConfigured } from '../supabase.js'

export const searchExamplesTool = {
  name: 'search_examples' as const,
  config: {
    title: 'Search Examples',
    description:
      'Search examples (user journey scenarios) by project or text. Examples document actor, goal, actions, errors, and outcomes.',
    inputSchema: {
      projectId: z.string().optional().describe('Filter by project UUID'),
      query: z.string().optional().describe('Search in actor, goal, actions, outcome'),
      limit: z.number().optional().default(20).describe('Max results (default 20)'),
    },
  },
  handler: async (args: {
    projectId?: string
    query?: string
    limit?: number
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Supabase not configured',
              examples: [],
            }),
          },
        ],
      }
    }

    try {
      let query = supabase
        .from('examples')
        .select('id, actor, goal, entry_point, actions, error, outcome, short_id, project_id')
        .order('created_at', { ascending: false })
        .limit(Math.min(args.limit ?? 20, 50))

      if (args.projectId) {
        query = query.eq('project_id', args.projectId)
      }

      if (args.query) {
        const term = `%${args.query}%`
        query = query.or(`actor.ilike.${term},goal.ilike.${term}`)
      }

      const { data, error } = await query

      if (error) throw error

      const examples = (data || []).map((e) => ({
        id: e.id,
        actor: e.actor,
        goal: e.goal,
        entry_point: e.entry_point,
        actions: e.actions,
        error: e.error,
        outcome: e.outcome,
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ examples }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message, examples: [] }),
          },
        ],
      }
    }
  },
}
