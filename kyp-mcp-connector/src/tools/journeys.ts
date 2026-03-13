import { z } from 'zod'
import { supabase, isSupabaseConfigured } from '../supabase.js'

export const listUserJourneysTool = {
  name: 'list_user_journeys' as const,
  config: {
    title: 'List User Journeys',
    description:
      'List user journeys, optionally filtered by project. Returns journey names, IDs, layouts, and descriptions.',
    inputSchema: {
      projectId: z.string().optional().describe('Filter by project UUID'),
    },
  },
  handler: async (args: {
    projectId?: string
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Supabase not configured',
              journeys: [],
            }),
          },
        ],
      }
    }

    try {
      let query = supabase
        .from('user_journeys')
        .select('id, name, description, layout, short_id, project_id, created_at')
        .order('created_at', { ascending: false })

      if (args.projectId) {
        query = query.eq('project_id', args.projectId)
      }

      const { data, error } = await query

      if (error) throw error

      const journeys = (data || []).map((j) => ({
        id: j.id,
        name: j.name,
        description: j.description || '',
        layout: j.layout || 'vertical',
        short_id: j.short_id,
        project_id: j.project_id,
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ journeys }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message, journeys: [] }),
          },
        ],
      }
    }
  },
}

export const getJourneyDetailsTool = {
  name: 'get_journey_details' as const,
  config: {
    title: 'Get Journey Details',
    description:
      'Get full details of a user journey including flow data (nodes and edges).',
    inputSchema: {
      journeyId: z.string().optional().describe('Journey UUID'),
      shortId: z.number().optional().describe('Journey short_id (numeric)'),
    },
  },
  handler: async (args: {
    journeyId?: string
    shortId?: number
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Supabase not configured' }),
          },
        ],
      }
    }

    if (!args.journeyId && args.shortId === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Provide either journeyId or shortId',
            }),
          },
        ],
      }
    }

    try {
      let query = supabase.from('user_journeys').select('*')

      if (args.journeyId) {
        query = query.eq('id', args.journeyId)
      } else if (args.shortId !== undefined) {
        query = query.eq('short_id', args.shortId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error

      if (!data) {
        return {
          content: [
            {
              type: 'text',
              text: 'Journey not found',
            },
          ],
        }
      }

      // Truncate flow_data if very large (MCP limit ~25k tokens)
      const flowData = data.flow_data as { nodes?: unknown[]; edges?: unknown[] } | null
      let summary = ''
      if (flowData?.nodes && flowData?.edges) {
        summary = ` (${flowData.nodes.length} nodes, ${flowData.edges.length} edges)`
      }

      const result = {
        id: data.id,
        name: data.name,
        description: data.description,
        layout: data.layout,
        short_id: data.short_id,
        project_id: data.project_id,
        flow_data: flowData,
        flow_summary: summary,
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
      }
    }
  },
}
