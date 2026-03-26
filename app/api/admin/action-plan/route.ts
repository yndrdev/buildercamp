import { NextRequest, NextResponse } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { clientId } = await req.json()

  // Fetch all completed conversations for this client
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ error: 'No completed conversations found' }, { status: 404 })
  }

  // Fetch client context
  const [{ data: client }, { data: knowledge }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', clientId).single(),
    supabase.from('client_knowledge').select('category, content').eq('client_id', clientId),
  ])

  const clientContext = knowledge?.filter((k) => k.category === 'client_context').map((k) => k.content).join('\n') || ''

  // Build a digest of all conversations
  const digest = conversations.map((convo) => {
    const messages = (convo.messages || [])
      .filter((m: { role: string }) => m.role === 'user')
      .map((m: { content: string }) => m.content)
      .join(' | ')
    return `${convo.respondent_name || 'Unknown'} (${convo.respondent_role || 'No role'}): ${messages}`
  }).join('\n\n')

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    thinking: { type: 'enabled', budget_tokens: 5000 },
    messages: [
      {
        role: 'user',
        content: `You are a workshop strategist for YNDR, an AI enablement consultancy. Based on the intake conversations below from ${client?.name || 'a client'}, generate a comprehensive action plan.

Company context: ${clientContext}

${conversations.length} participants completed intake:
${digest}

Generate a JSON response (no markdown, no code blocks) with this structure:
{"workshop_brief":"2-3 paragraph executive summary of what this team needs","pain_points":[{"area":"area name","description":"what hurts","affected_roles":["role1"],"priority":"high"}],"action_items":[{"title":"specific action","description":"what to do and why","owner":"Chris or participant role","timeline":"during workshop or post-workshop","prompt":"a ready-to-use Claude prompt that addresses this action item"}],"session_recommendations":[{"session":"session name","focus_areas":["area1"],"demo_ideas":["idea1"],"customization_notes":"how to tailor for this group"}],"quick_wins":[{"title":"quick win","description":"something they can do in the first 5 minutes of the workshop","impact":"high"}]}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const text = textBlock?.text || '{}'

  let plan
  try {
    plan = JSON.parse(text)
  } catch {
    plan = { workshop_brief: text, pain_points: [], action_items: [], session_recommendations: [], quick_wins: [] }
  }

  return NextResponse.json({ plan, participantCount: conversations.length })
}
