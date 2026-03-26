import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import claude from '@/lib/claude'
import type { QuestionSection } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { clientId } = await req.json()

  // Fetch all contextual data in parallel
  const [
    { data: client },
    { data: sessionGroups },
    { data: roles },
    { data: knowledge },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('session_groups').select('*').eq('client_id', clientId).order('sort_order'),
    supabase.from('client_roles').select('title').eq('client_id', clientId).order('sort_order'),
    supabase.from('client_knowledge').select('category, key, content').eq('client_id', clientId),
  ])

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Build question sections (we'll need them after session is selected)
  const sgIds = (sessionGroups || []).map((sg) => sg.id)
  const { data: allQuestions } = sgIds.length > 0
    ? await supabase.from('questions').select('*').in('session_group_id', sgIds).order('sort_order')
    : { data: [] }

  // Group questions by session group, then by section header
  const questionsByGroup: Record<string, QuestionSection[]> = {}
  for (const sg of sessionGroups || []) {
    const groupQs = (allQuestions || []).filter((q) => q.session_group_id === sg.id)
    const sections: QuestionSection[] = []
    for (const q of groupQs) {
      if (q.section_header && (sections.length === 0 || sections[sections.length - 1].header !== q.section_header)) {
        sections.push({ header: q.section_header, questions: [] })
      } else if (sections.length === 0) {
        sections.push({ header: null, questions: [] })
      }
      sections[sections.length - 1].questions.push({
        id: q.id,
        label: q.label,
        isRequired: q.is_required,
      })
    }
    questionsByGroup[sg.id] = sections
  }

  // Get client context for greeting
  const clientContext = knowledge
    ?.filter((k) => k.category === 'client_context')
    .map((k) => k.content)
    .join('\n') || ''

  // Generate greeting
  const greetingResponse = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a friendly intake assistant for BuilderCamp (an AI Enablement workshop by YNDR) helping participants from ${client.name}. Generate a warm, concise greeting (2 sentences max). Ask them their name. Do NOT use markdown. Context: ${clientContext}`,
      },
    ],
  })

  const greeting = greetingResponse.content.find((b) => b.type === 'text')?.text || 'Welcome! What is your name?'

  // Create conversation record
  const initialMessages = [{ role: 'assistant' as const, content: greeting, timestamp: new Date().toISOString() }]
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      messages: initialMessages,
      status: 'in_progress',
    })
    .select('id, resume_token')
    .single()

  if (error || !conversation) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  return NextResponse.json({
    conversationId: conversation.id,
    resumeToken: conversation.resume_token,
    greeting,
    sessionGroups: sessionGroups || [],
    roles: (roles || []).map((r) => r.title),
    questionsByGroup,
  })
}
