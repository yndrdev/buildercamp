import { NextRequest, NextResponse } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { logEvent } from '@/lib/log-event'
import { notifyInterviewComplete, notifyParticipant } from '@/lib/notify'

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

  const { error } = await supabase
    .from('conversations')
    .update({ analysis })
    .eq('id', conversationId)

  if (error) {
    await logEvent('analysis_failed', {
      conversationId,
      clientId: convo.client_id,
      actorEmail: convo.respondent_email,
      eventData: { error: error.message, stage: 'db_save' },
    })
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
  }

  await logEvent('analysis_generated', {
    conversationId,
    clientId: convo.client_id,
    actorEmail: convo.respondent_email,
    eventData: { themes: analysis.themes?.length || 0, tasks: analysis.tasks?.length || 0 },
  })

  // Send email notification
  const { data: client } = await supabase.from('clients').select('name').eq('id', convo.client_id).single()
  const { data: sessionGroup } = convo.session_group_id
    ? await supabase.from('session_groups').select('name').eq('id', convo.session_group_id).single()
    : { data: null }

  await Promise.all([
    notifyInterviewComplete({
      respondentName: convo.respondent_name,
      respondentEmail: convo.respondent_email,
      respondentRole: convo.respondent_role,
      clientName: client?.name || 'Unknown',
      sessionName: sessionGroup?.name || null,
      messageCount: (convo.messages || []).length,
      analysis,
    }),
    notifyParticipant({
      respondentName: convo.respondent_name,
      respondentEmail: convo.respondent_email,
      respondentRole: convo.respondent_role,
      clientName: client?.name || 'BuilderCamp',
      sessionName: sessionGroup?.name || null,
    }),
  ])

  return NextResponse.json({ analysis })
}
