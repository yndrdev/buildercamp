import { NextRequest, NextResponse } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { conversationId } = await req.json()

  const { data: convo } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (!convo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: knowledge } = await supabase
    .from('client_knowledge')
    .select('category, content')
    .eq('client_id', convo.client_id)

  const clientContext = knowledge?.filter((k) => k.category === 'client_context').map((k) => k.content).join('\n') || ''

  // Build transcript text
  const transcript = (convo.messages || [])
    .map((m: { role: string; content: string }) => `${m.role === 'assistant' ? 'BuilderCamp AI' : convo.respondent_name || 'Participant'}: ${m.content}`)
    .join('\n\n')

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Analyze this BuilderCamp pre-session intake conversation. The participant is ${convo.respondent_name || 'Unknown'} (${convo.respondent_role || 'Unknown role'}).

Company context: ${clientContext}

Transcript:
${transcript}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{"summary":"2-3 sentence executive summary","themes":["theme1","theme2"],"tasks":[{"title":"task name","description":"why it matters","priority":"high"}],"prep_notes":"Role-specific notes for the workshop facilitator"}`,
      },
    ],
  })

  const text = response.content.find((b) => b.type === 'text')?.text || '{}'
  let analysis
  try {
    analysis = JSON.parse(text)
  } catch {
    analysis = { summary: text, themes: [], tasks: [], prep_notes: '' }
  }

  await supabase
    .from('conversations')
    .update({ analysis })
    .eq('id', conversationId)

  return NextResponse.json({ analysis })
}
