import { z } from 'zod'
import { supabase, isSupabaseConfigured } from '../supabase.js'

export const listStakeholdersTool = {
  name: 'list_stakeholders' as const,
  config: {
    title: 'List Stakeholders',
    description:
      'List all stakeholders in the workspace. Stakeholders represent users, roles, or personas.',
    inputSchema: {
      limit: z.number().optional().default(50).describe('Max results (default 50)'),
    },
  },
  handler: async (args: {
    limit?: number
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Supabase not configured',
              stakeholders: [],
            }),
          },
        ],
      }
    }

    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, name, department, short_id, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.min(args.limit ?? 50, 100))

      if (error) throw error

      const stakeholders = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        department: s.department || '',
        short_id: s.short_id,
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ stakeholders }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message, stakeholders: [] }),
          },
        ],
      }
    }
  },
}
