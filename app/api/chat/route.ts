import { NextRequest } from 'next/server'
import claude from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { logEvent } from '@/lib/log-event'

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

  await logEvent('message_sent', {
    conversationId,
    clientId,
    actorEmail: convo.respondent_email,
    eventData: { messageIndex: messages.length - 1 },
  })

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
    const sessionList = (sessionGroups || []).map((sg) => `- "${sg.name}" (id: ${sg.id})${sg.description ? ` — ${sg.description}` : ''}`).join('\n')
    phaseInstructions = `${convo.respondent_name} is a ${convo.respondent_role}. They haven't selected a session track yet. Ask which session they'll attend. Options:
${sessionList}

When the participant clearly indicates which session they want (by name, paraphrase, or confirming an inferred match based on their role), end your message with <!--SESSION:<id>--> using the EXACT id from the list above. Use this marker as soon as the choice is clear, even if the participant phrases it loosely (e.g. "the consultants one", "Business and Payment", "yeah that one"). Only use one marker per message.`
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
- Keep messages to 1-2 sentences max. This is a rapid 3-minute intake, not an interview.
- Do NOT ask follow-up questions. Accept their answer, briefly acknowledge it (5 words or less), then immediately ask the next question in the same message.
- For required questions, gently encourage an answer if they try to skip.
- When suggesting options (roles, sessions, select questions), list them naturally.
- Do NOT use markdown formatting. Plain text only.
- NEVER use emojis. No smiley faces, no thumbs up, no fire, nothing. Keep it clean and professional.
- NEVER use em dashes or en dashes. Use commas, periods, or "and" instead of dashes.
- After each answered question, end your message with <!--ANSWERED:question_id_here-->
- When the participant selects a session track, end your message with <!--SESSION:session_id_here--> using the EXACT id from the Current Phase block. Emit this exactly once, in the message where the choice becomes clear.
- When ALL questions have been asked OR the participant wants to wrap up, generate a brief "What I Heard" summary. Start with "Here is what I heard:" then summarize in 3-4 bullet points (use ">" at the start of each). End with "Does this capture everything?" Then add <!--COMPLETE--> at the very end.
- These markers are hidden from the user, include them at the very end.
- There are only 5 questions. Move through them as fast as possible. No small talk between questions.

## After Completion
Once you've emitted <!--COMPLETE-->, the intake is done. If the participant keeps asking questions (e.g. "where do I go now?", "what's next?", "did I get an email?"), answer honestly using these facts:
- A confirmation email is sent to the email address they signed in with. It can take a few minutes to arrive and may land in spam.
- Session details (timing, meeting link, prep materials) come directly from their company contact, NOT from BuilderCamp. Do not promise links, calendars, or details you cannot deliver.
- There is no "Session Track" page to navigate to. The "Session track" item in the sidebar is just a progress indicator for the intake, not a clickable destination.
- If they have not received the confirmation email after a few minutes, suggest checking spam, then reaching out to chris@yndr.com for a manual follow-up.
NEVER invent a confirmation email, dashboard link, or next-step URL that you have not been told exists.`

  // Build API messages (convert our format to Anthropic format)
  const apiMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Stream response
  const stream = await claude.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    system: systemPrompt,
    messages: apiMessages,
  })

  let fullResponse = ''
  let streamAborted = false

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            fullResponse += text
            try {
              controller.enqueue(new TextEncoder().encode(text))
            } catch {
              // Client disconnected mid-stream
              streamAborted = true
              break
            }
          }
        }
      } catch (err) {
        streamAborted = true
        await logEvent('stream_error', {
          conversationId,
          clientId,
          actorEmail: convo.respondent_email,
          eventData: { error: String(err), partialLength: fullResponse.length },
        })
      } finally {
        // Always save whatever we have — full or partial
        const answeredMarkers: string[] = []
        let markerMatch: RegExpExecArray | null
        const markerRegex = /<!--ANSWERED:([^>]+)-->/g
        while ((markerMatch = markerRegex.exec(fullResponse)) !== null) {
          answeredMarkers.push(markerMatch[1])
        }
        const sessionMarkerMatch = /<!--SESSION:([a-f0-9-]+)-->/i.exec(fullResponse)
        const validSessionIds = new Set((sessionGroups || []).map((sg) => sg.id))
        const sessionMarker = sessionMarkerMatch && validSessionIds.has(sessionMarkerMatch[1]) ? sessionMarkerMatch[1] : null
        const isComplete = fullResponse.includes('<!--COMPLETE-->')
        const cleanResponse = fullResponse
          .replace(/<!--ANSWERED:[^>]+-->/g, '')
          .replace(/<!--SESSION:[^>]+-->/g, '')
          .replace(/<!--COMPLETE-->/g, '')
          .trim()

        if (cleanResponse.length > 0) {
          const updates: Record<string, unknown> = {
            messages: [...messages, { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }],
          }

          if (answeredMarkers.length > 0) {
            updates.answered_question_ids = Array.from(new Set([...(convo.answered_question_ids || []), ...answeredMarkers]))
          }

          if (sessionMarker && !convo.session_group_id) {
            updates.session_group_id = sessionMarker
          }

          // Try to extract name from early conversation
          if (!convo.respondent_name && messages.length <= 4) {
            const userMessages = messages.filter((m) => m.role === 'user')
            if (userMessages.length === 1) {
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

          await logEvent(streamAborted ? 'ai_response_partial' : 'ai_response_saved', {
            conversationId,
            clientId,
            actorEmail: convo.respondent_email,
            eventData: {
              responseLength: cleanResponse.length,
              answeredQuestions: answeredMarkers,
              sessionMarker,
              isComplete,
              streamAborted,
            },
          })
        }

        try { controller.close() } catch { /* already closed */ }
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

  const { error } = await supabase.from('conversations').update(updates).eq('id', conversationId)

  if (error) {
    await logEvent('phase_transition', {
      conversationId,
      eventData: { ...updates, success: false, error: error.message },
    })
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  await logEvent('phase_transition', {
    conversationId,
    eventData: { ...updates, success: true },
  })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
