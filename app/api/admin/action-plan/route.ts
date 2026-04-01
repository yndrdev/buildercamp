import { NextRequest, NextResponse } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { clientId } = await req.json()

  // Fetch ALL conversations with at least some messages (not just completed)
  const { data: allConversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_id', clientId)
    .order('started_at', { ascending: false })

  // Filter to conversations that have user messages (actual responses)
  const conversations = (allConversations || []).filter((c) => {
    const userMsgs = (c.messages || []).filter((m: { role: string }) => m.role === 'user')
    return userMsgs.length > 0
  })

  if (conversations.length === 0) {
    return NextResponse.json({ error: 'No conversations with responses found. Participants need to answer at least one question.' }, { status: 404 })
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
    return `${convo.respondent_name || 'Unknown'} (${convo.respondent_role || 'No role'}, ${convo.status}): ${messages}`
  }).join('\n\n')

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a workshop strategist for YNDR, an AI enablement consultancy. Based on the intake conversations below from ${client?.name || 'a client'}, generate a comprehensive action plan. Some participants may still be in progress, work with what you have.

Company context: ${clientContext}

${conversations.length} participants responded:
${digest}

Generate a JSON response (no markdown, no code blocks) with this structure:
{"workshop_brief":"2-3 paragraph executive summary of what this team needs","pain_points":[{"area":"area name","description":"what hurts","affected_roles":["role1"],"priority":"high"}],"action_items":[{"title":"specific action","description":"what to do and why","owner":"Chris or participant role","timeline":"during workshop or post-workshop","prompt":"a ready-to-use Claude prompt that addresses this action item"}],"quick_wins":[{"title":"quick win","description":"something they can do in the first 5 minutes of the workshop","impact":"high"}]}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  let text = textBlock?.text || '{}'

  // Strip markdown code blocks if Claude wrapped the JSON
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  let plan
  try {
    plan = JSON.parse(text)
  } catch {
    // Try to recover individual fields from truncated JSON
    const extract = (key: string) => {
      const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
      const m = text.match(re)
      return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : ''
    }
    const extractArray = (key: string) => {
      const re = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`)
      const m = text.match(re)
      if (!m) return []
      try {
        // Try to parse complete array
        return JSON.parse(`[${m[1]}]`)
      } catch {
        // Try to parse up to the last complete object
        const objects: unknown[] = []
        const objRe = /\{[^{}]*\}/g
        let om
        while ((om = objRe.exec(m[1])) !== null) {
          try { objects.push(JSON.parse(om[0])) } catch { /* skip malformed */ }
        }
        return objects
      }
    }
    plan = {
      workshop_brief: extract('workshop_brief') || text,
      pain_points: extractArray('pain_points'),
      action_items: extractArray('action_items'),
      quick_wins: extractArray('quick_wins'),
    }
  }

  return NextResponse.json({ plan, participantCount: conversations.length })
}
