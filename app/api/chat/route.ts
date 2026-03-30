import { NextRequest } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { conversationId, clientId, message } = await req.json()

  // Load conversation
  const { data: convo } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (!convo) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 })
  }

  // Append user message
  const userMsg = { role: 'user' as const, content: message, timestamp: new Date().toISOString() }
  const messages = [...(convo.messages || []), userMsg]

  // Update messages in DB immediately
  await supabase
    .from('conversations')
    .update({ messages })
    .eq('id', conversationId)

  // Load context
  const [{ data: knowledge }, { data: sessionGroups }, { data: roles }, { data: questions }] = await Promise.all([
    supabase.from('client_knowledge').select('category, key, content').eq('client_id', clientId),
    supabase.from('session_groups').select('*').eq('client_id', clientId).order('sort_order'),
    supabase.from('client_roles').select('title').eq('client_id', clientId).order('sort_order'),
    convo.session_group_id
      ? supabase.from('questions').select('*').eq('session_group_id', convo.session_group_id).order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  const clientContext = knowledge?.filter((k) => k.category === 'client_context').map((k) => k.content).join('\n') || ''
  const roleContexts = knowledge?.filter((k) => k.category === 'role_context') || []
  const roleMatch = convo.respondent_role
    ? roleContexts.find((k) => k.key.toLowerCase().includes(convo.respondent_role!.toLowerCase())) || roleContexts.find((k) => k.key === 'default')
    : null
  const roleContext = roleMatch?.content || ''

  // Build question list for the system prompt
  let questionPrompt = ''
  if (questions && questions.length > 0) {
    const answered = new Set(convo.answered_question_ids || [])
    let currentSection = ''
    for (const q of questions) {
      if (q.section_header && q.section_header !== currentSection) {
        currentSection = q.section_header
        questionPrompt += `\n### ${currentSection}\n`
      }
      const status = answered.has(q.id) ? '[DONE]' : '[PENDING]'
      questionPrompt += `- ${status} ID:${q.id} | Required:${q.is_required} | "${q.label}"`
      if (q.hint) questionPrompt += ` (Hint: ${q.hint})`
      if (q.field_type === 'select' && q.options) questionPrompt += ` Options: [${q.options.join(', ')}]`
      questionPrompt += '\n'
    }
  }

  // Determine conversation phase
  let phaseInstructions = ''
  if (!convo.respondent_name) {
    phaseInstructions = 'The participant has not shared their name yet. If they just told you their name in this message, acknowledge it warmly and ask about their role.'
  } else if (!convo.respondent_role) {
    phaseInstructions = `The participant's name is ${convo.respondent_name}. They haven't selected a role yet. Ask them to choose their role. Available roles: ${(roles || []).map((r) => r.title).join(', ')}.`
  } else if (!convo.session_group_id) {
    phaseInstructions = `${convo.respondent_name} is a ${convo.respondent_role}. They haven't selected a session track yet. Ask which session they'll attend. Options: ${(sessionGroups || []).map((sg) => `"${sg.name}" - ${sg.description || ''}`).join('; ')}.`
  } else {
    phaseInstructions = `${convo.respondent_name} is a ${convo.respondent_role}. They are in the "${sessionGroups?.find((sg) => sg.id === convo.session_group_id)?.name}" session. Proceed through the PENDING questions below, asking ONE at a time. You may ask ONE brief follow-up on interesting answers before moving on.`
  }

  const systemPrompt = `You are a friendly, professional intake assistant for BuilderCamp, an AI Enablement workshop by YNDR. You guide participants through a pre-session intake via natural conversation.

## Current Phase
${phaseInstructions}

## Company Context
${clientContext}

${roleContext ? `## Role Context\n${roleContext}` : ''}

${questionPrompt ? `## Questions to Ask (in order)\n${questionPrompt}` : ''}

## Rules
- Ask ONE question at a time. Wait for a response before the next.
- Keep messages concise (2-3 sentences). This is a quick 5-minute intake, not a long interview.
- For interesting answers, you may ask ONE brief follow-up before moving on.
- For required questions, gently encourage an answer if they try to skip.
- When suggesting options (roles, sessions, select questions), list them naturally.
- Do NOT use markdown formatting. Plain text only.
- NEVER use emojis. No smiley faces, no thumbs up, no fire, nothing. Keep it clean and professional.
- NEVER use em dashes or en dashes. Use commas, periods, or "and" instead of dashes.
- After each answered question, end your message with <!--ANSWERED:question_id_here-->
- When ALL questions (required and optional) have been asked OR the participant wants to wrap up, generate a "What I Heard" summary. Start with "Here is what I heard from our conversation:" then summarize their key points in 3-5 bullet points (use ">" at the start of each). End with "Does this capture everything? Feel free to add anything I missed." Then add <!--COMPLETE--> at the very end.
- These markers are hidden from the user — include them at the very end.
- There are only about 5 questions total per session. Move through them efficiently.`

  // Build API messages (convert our format to Anthropic format)
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Stream response
  const stream = await claude.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    system: systemPrompt,
    messages: apiMessages,
  })

  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(text))
          }
        }

        // Process markers and update DB after stream completes
        const answeredMarkers: string[] = []
        let markerMatch: RegExpExecArray | null
        const markerRegex = /<!--ANSWERED:([^>]+)-->/g
        while ((markerMatch = markerRegex.exec(fullResponse)) !== null) {
          answeredMarkers.push(markerMatch[1])
        }
        const isComplete = fullResponse.includes('<!--COMPLETE-->')
        const cleanResponse = fullResponse.replace(/<!--ANSWERED:[^>]+-->/g, '').replace(/<!--COMPLETE-->/g, '').trim()

        // Detect name, role, session from conversation context
        const updates: Record<string, unknown> = {
          messages: [...messages, { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }],
        }

        if (answeredMarkers.length > 0) {
          updates.answered_question_ids = Array.from(new Set([...(convo.answered_question_ids || []), ...answeredMarkers]))
        }

        // Try to extract name from early conversation
        if (!convo.respondent_name && messages.length <= 4) {
          const userMessages = messages.filter((m) => m.role === 'user')
          if (userMessages.length === 1) {
            // First user message is likely their name
            const name = userMessages[0].content.trim().replace(/^(my name is |i'm |i am |hi,? i'm |hey,? i'm )/i, '').replace(/[.!]$/, '').trim()
            if (name.length > 0 && name.length < 50 && !name.includes(' is ')) {
              updates.respondent_name = name
            }
          }
        }

        if (isComplete) {
          updates.status = 'completed'
          updates.completed_at = new Date().toISOString()
        }

        await supabase.from('conversations').update(updates).eq('id', conversationId)

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}

// PATCH: update conversation metadata (session group, role, name)
export async function PATCH(req: NextRequest) {
  const { conversationId, sessionGroupId, respondentRole, respondentName } = await req.json()

  const updates: Record<string, unknown> = {}
  if (sessionGroupId) updates.session_group_id = sessionGroupId
  if (respondentRole) updates.respondent_role = respondentRole
  if (respondentName) updates.respondent_name = respondentName

  await supabase.from('conversations').update(updates).eq('id', conversationId)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
