export interface Client {
  id: string
  slug: string
  name: string
  logo_url: string | null
}

export interface SessionGroup {
  id: string
  client_id: string
  name: string
  description: string | null
  sort_order: number
}

export interface Question {
  id: string
  session_group_id: string
  label: string
  hint: string | null
  field_type: 'text' | 'textarea' | 'select'
  options: string[] | null
  is_required: boolean
  sort_order: number
  section_header: string | null
}

export interface ChatAttachment {
  url: string
  name: string
  type: string
  size: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  questionId?: string
  attachments?: ChatAttachment[]
}

export interface QuestionSection {
  header: string | null
  questions: { id: string; label: string; isRequired: boolean }[]
}

export interface ConversationData {
  id: string
  client_id: string
  session_group_id: string | null
  respondent_name: string | null
  respondent_email: string | null
  respondent_role: string | null
  messages: ChatMessage[]
  answered_question_ids: string[]
  status: 'in_progress' | 'completed' | 'abandoned'
  analysis: Record<string, unknown> | null
  started_at: string
  completed_at: string | null
  resume_token: string
}
