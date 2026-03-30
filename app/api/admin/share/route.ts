import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import claude from '@/lib/claude'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { clientId } = await req.json()

  // Fetch client + conversations
  const [{ data: client }, { data: conversations }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', clientId).single(),
    supabase.from('conversations').select('respondent_name, respondent_role, messages, status, analysis, answered_question_ids').eq('client_id', clientId).order('started_at', { ascending: false }),
  ])

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const completed = (conversations || []).filter((c) => c.status === 'completed')
  const inProgress = (conversations || []).filter((c) => c.status === 'in_progress')

  // Build participant summary
  const participants = (conversations || []).map((c) => ({
    name: c.respondent_name || 'Unknown',
    role: c.respondent_role || 'No role',
    status: c.status,
    questionCount: (c.answered_question_ids || []).length,
  }))

  // Generate executive summary if there are completed conversations
  let executiveSummary = ''
  if (completed.length > 0) {
    const digest = completed.map((c) => {
      const userMsgs = (c.messages || []).filter((m: { role: string }) => m.role === 'user').map((m: { content: string }) => m.content).join(' | ')
      return `${c.respondent_name} (${c.respondent_role}): ${userMsgs}`
    }).join('\n')

    const response = await claude.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Write a brief executive summary (3-4 paragraphs) of the pre-workshop intake findings for ${client.name}. ${completed.length} participants completed their intake. Do not use emojis or dashes. Keep it professional and actionable.\n\nParticipant responses:\n${digest}`,
      }],
    })
    executiveSummary = response.content.find((b) => b.type === 'text')?.text || ''
  }

  // Collect existing analyses
  const analyses = completed
    .filter((c) => c.analysis)
    .map((c) => ({
      name: c.respondent_name,
      role: c.respondent_role,
      ...c.analysis,
    }))

  // Create shared report
  const content = {
    clientName: client.name,
    generatedAt: new Date().toISOString(),
    stats: {
      total: (conversations || []).length,
      completed: completed.length,
      inProgress: inProgress.length,
    },
    participants,
    executiveSummary,
    analyses,
  }

  const { data: report, error } = await supabase
    .from('shared_reports')
    .insert({
      client_id: clientId,
      title: `${client.name} BuilderCamp Intake Report`,
      content,
    })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: report.token })
}
