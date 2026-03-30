import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { QuestionSection } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { clientId, userEmail } = await req.json()

  // Fetch all contextual data in parallel
  const [
    { data: client },
    { data: sessionGroups },
    { data: roles },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('session_groups').select('*').eq('client_id', clientId).order('sort_order'),
    supabase.from('client_roles').select('title').eq('client_id', clientId).order('sort_order'),
  ])

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Build question sections
  const sgIds = (sessionGroups || []).map((sg) => sg.id)
  const { data: allQuestions } = sgIds.length > 0
    ? await supabase.from('questions').select('*').in('session_group_id', sgIds).order('sort_order')
    : { data: [] }

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

  // Check for existing conversation by this user's email
  let existingConversation = null
  if (userEmail) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .eq('respondent_email', userEmail.toLowerCase())
      .order('started_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      existingConversation = existing[0]
    }
  }

  // Resume existing conversation
  if (existingConversation) {
    return NextResponse.json({
      conversationId: existingConversation.id,
      resumeToken: existingConversation.resume_token,
      greeting: null, // no greeting for resume
      resumed: true,
      existingMessages: existingConversation.messages || [],
      existingStatus: existingConversation.status,
      respondentName: existingConversation.respondent_name,
      respondentRole: existingConversation.respondent_role,
      sessionGroupId: existingConversation.session_group_id,
      answeredQuestionIds: existingConversation.answered_question_ids || [],
      analysis: existingConversation.analysis,
      sessionGroups: sessionGroups || [],
      roles: (roles || []).map((r) => r.title),
      questionsByGroup,
    })
  }

  // New conversation
  const greeting = `Hey there, welcome to YNDR's BuilderCamp. This will take less than 10 minutes. Can I start with your name?`

  const initialMessages = [{ role: 'assistant' as const, content: greeting, timestamp: new Date().toISOString() }]
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      client_id: clientId,
      messages: initialMessages,
      status: 'in_progress',
      respondent_email: userEmail?.toLowerCase() || null,
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
    resumed: false,
    sessionGroups: sessionGroups || [],
    roles: (roles || []).map((r) => r.title),
    questionsByGroup,
  })
}
