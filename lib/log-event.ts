import { supabase } from '@/lib/supabase'

export type EventType =
  | 'conversation_created'
  | 'conversation_resumed'
  | 'message_sent'
  | 'ai_response_saved'
  | 'ai_response_partial'
  | 'stream_error'
  | 'phase_transition'
  | 'analysis_generated'
  | 'analysis_failed'
  | 'user_login'
  | 'user_domain_matched'
  | 'user_domain_rejected'

export async function logEvent(
  eventType: EventType,
  data: {
    conversationId?: string | null
    clientId?: string | null
    actorEmail?: string | null
    eventData?: Record<string, unknown>
  }
) {
  try {
    await supabase.from('conversation_events').insert({
      conversation_id: data.conversationId || null,
      client_id: data.clientId || null,
      event_type: eventType,
      event_data: data.eventData || {},
      actor_email: data.actorEmail || null,
    })
  } catch {
    // Last-resort: log to stderr so Vercel runtime logs capture it
    console.error('[logEvent failed]', eventType, data)
  }
}
