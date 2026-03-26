import { NextRequest, NextResponse } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { clientId, sessionGroupName, respondentName, respondentRole, answers } = await req.json()

  // Fetch client knowledge: company context + role-specific context
  const { data: knowledge } = await supabase
    .from('client_knowledge')
    .select('category, key, content')
    .eq('client_id', clientId)

  const clientContext = knowledge
    ?.filter((k) => k.category === 'client_context')
    .map((k) => k.content)
    .join('\n\n') || ''

  // Find the best role match or fall back to default
  const roleContexts = knowledge?.filter((k) => k.category === 'role_context') || []
  const normalizedRole = (respondentRole || '').toLowerCase().trim()

  let roleMatch = roleContexts.find((k) =>
    normalizedRole.includes(k.key.toLowerCase()) || k.key.toLowerCase().includes(normalizedRole)
  )
  if (!roleMatch) {
    roleMatch = roleContexts.find((k) => k.key === 'default')
  }
  const roleContext = roleMatch?.content || ''

  // Build a summary of their answers (first 3 for context, keep it brief)
  const answerEntries = Object.entries(answers || {})
  const answerSummary = answerEntries
    .slice(0, 3)
    .map(([, value]) => String(value))
    .filter((v) => v.trim().length > 0)
    .join('; ')

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Generate a brief, warm, personalized acknowledgment (2-3 sentences max) for someone who just submitted their pre-session intake form for an AI Enablement workshop.

Their details:
- Name: ${respondentName}
- Role: ${respondentRole || 'Not specified'}
- Session: ${sessionGroupName}
- A few of their responses: ${answerSummary || 'None provided yet'}

Context about their company:
${clientContext}

Context about their role:
${roleContext}

Guidelines:
- Address them by first name
- Acknowledge their specific role and what it means for the workshop
- Reference something specific from their answers if available
- Keep it warm but professional, 2-3 sentences
- Do NOT use any markdown formatting, just plain text
- End with something that builds anticipation for the session`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const message = textBlock?.text || ''

  // Store this interaction as a session insight for future context
  if (message) {
    await supabase.from('client_knowledge').upsert(
      {
        client_id: clientId,
        category: 'session_insight',
        key: `${respondentName}_${sessionGroupName}`.replace(/\s+/g, '_').toLowerCase(),
        content: `${respondentName} (${respondentRole || 'no role specified'}) submitted intake for ${sessionGroupName}. Their focus areas include: ${answerSummary || 'not specified'}.`,
      },
      { onConflict: 'client_id,category,key' }
    )
  }

  return NextResponse.json({ message })
}
