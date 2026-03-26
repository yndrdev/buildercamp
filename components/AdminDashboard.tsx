'use client'

import { useState } from 'react'
import { Lock, ChatDots, FileText, CaretDown, CaretUp, Lightning } from '@phosphor-icons/react'

interface SessionGroup { id: string; name: string }
interface Question { id: string; session_group_id: string; label: string }
interface Submission {
  id: string; session_group_id: string; respondent_name: string
  respondent_email: string; respondent_role: string | null
  answers: Record<string, string>; submitted_at: string
}
interface Conversation {
  id: string; session_group_id: string | null; respondent_name: string | null
  respondent_email: string | null; respondent_role: string | null
  messages: { role: string; content: string; timestamp: string }[]
  answered_question_ids: string[]; status: string
  analysis: { summary?: string; themes?: string[]; tasks?: { title: string; description: string; priority: string }[]; prep_notes?: string } | null
  started_at: string; completed_at: string | null
}

interface Props {
  clientSlug: string; clientName: string; sessionGroups: SessionGroup[]
  questions: Question[]; submissions: Submission[]; conversations: Conversation[]
}

const ADMIN_PIN = 'yndr2026'

export default function AdminDashboard({ clientSlug, clientName, sessionGroups, questions, submissions, conversations }: Props) {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversations' | 'forms'>('conversations')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!authenticated) {
    return (
      <div className="max-w-[400px] mx-auto px-6 pt-[120px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <Lock weight="bold" className="w-5 h-5 text-[var(--coral)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">Admin Access</h1>
          <p className="text-[13px] text-[var(--text-muted)]">{clientName} responses</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (pin === ADMIN_PIN) { setAuthenticated(true) } else { setPinError(true); setPin('') } }}>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false) }}
            placeholder="Enter PIN"
            className={`w-full bg-[var(--surface)] border ${pinError ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] px-4 py-3 text-center text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40 mb-3`}
            autoFocus
          />
          {pinError && <p className="text-red-400 text-[12px] text-center mb-3">Incorrect PIN</p>}
          <button type="submit" className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--coral)] text-white font-medium text-[14px] hover:bg-[var(--coral-light)] transition-colors">
            View Responses
          </button>
        </form>
      </div>
    )
  }

  const totalResponses = submissions.length + conversations.length

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-16 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/avatar.svg" alt="" className="w-9 h-9 rounded-full" />
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">{clientName}</h1>
          <p className="text-[12px] text-[var(--text-muted)]">{totalResponses} response{totalResponses !== 1 ? 's' : ''} total</p>
        </div>
        <a href={`/${clientSlug}`} className="ml-auto text-[13px] text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors">
          Intake form
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium transition-all ${
            activeTab === 'conversations' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--coral)]/30'
          }`}
        >
          <ChatDots weight="bold" className="w-3.5 h-3.5" />
          Conversations ({conversations.length})
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium transition-all ${
            activeTab === 'forms' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--coral)]/30'
          }`}
        >
          <FileText weight="bold" className="w-3.5 h-3.5" />
          Form Submissions ({submissions.length})
        </button>
      </div>

      {/* Conversations tab */}
      {activeTab === 'conversations' && (
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[14px]">No conversations yet.</div>
          ) : conversations.map((convo) => (
            <div key={convo.id} className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface)] overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === convo.id ? null : convo.id)}
                className="w-full text-left p-5 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--coral)] font-bold text-[11px]">
                      {(convo.respondent_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-[var(--text-primary)]">{convo.respondent_name || 'Unknown'}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {convo.respondent_role || 'No role'}
                        {convo.session_group_id && ` / ${sessionGroups.find((sg) => sg.id === convo.session_group_id)?.name || ''}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-full)] ${
                      convo.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {convo.status === 'completed' ? 'Complete' : 'In Progress'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {new Date(convo.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {expandedId === convo.id ? <CaretUp className="w-4 h-4 text-[var(--text-muted)]" /> : <CaretDown className="w-4 h-4 text-[var(--text-muted)]" />}
                  </div>
                </div>
              </button>

              {expandedId === convo.id && (
                <div className="border-t border-[var(--border)]">
                  {/* AI Analysis */}
                  {convo.analysis && (
                    <div className="p-5 border-b border-[var(--border)] bg-[var(--coral)]/3">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightning weight="fill" className="w-4 h-4 text-[var(--coral)]" />
                        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)]">AI Analysis</span>
                      </div>
                      {convo.analysis.summary && (
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-3">{convo.analysis.summary}</p>
                      )}
                      {convo.analysis.themes && convo.analysis.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {convo.analysis.themes.map((theme, i) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                              {theme}
                            </span>
                          ))}
                        </div>
                      )}
                      {convo.analysis.prep_notes && (
                        <div className="border-l-2 border-[var(--coral)] pl-3 mt-3">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">Prep Notes</span>
                          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{convo.analysis.prep_notes}</p>
                        </div>
                      )}
                      {convo.analysis.tasks && convo.analysis.tasks.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-2">Suggested Tasks</span>
                          {convo.analysis.tasks.map((task, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                task.priority === 'high' ? 'bg-[var(--coral)]/15 text-[var(--coral)]' : 'bg-[var(--surface)] text-[var(--text-muted)]'
                              }`}>{task.priority}</span>
                              <div>
                                <span className="text-[12px] text-[var(--text-primary)] font-medium">{task.title}</span>
                                <span className="text-[11px] text-[var(--text-muted)] ml-1.5">{task.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript */}
                  <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] block mb-2">Transcript</span>
                    {(convo.messages || []).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] text-[12px] leading-relaxed px-3 py-2 rounded-[var(--radius-md)] ${
                          msg.role === 'user'
                            ? 'bg-[var(--coral)]/10 text-[var(--text-primary)]'
                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Forms tab */}
      {activeTab === 'forms' && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[14px]">No form submissions yet.</div>
          ) : submissions.map((sub) => (
            <div key={sub.id} className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface)] overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="w-full text-left p-5 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--coral)] font-bold text-[11px]">
                      {sub.respondent_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-[var(--text-primary)]">{sub.respondent_name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{sub.respondent_email}{sub.respondent_role && ` / ${sub.respondent_role}`}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
              {expandedId === sub.id && (
                <div className="border-t border-[var(--border)] p-5 space-y-3">
                  {questions.filter((q) => q.session_group_id === sub.session_group_id).map((q) => {
                    const answer = sub.answers[q.id]
                    if (!answer) return null
                    return (
                      <div key={q.id}>
                        <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{q.label}</div>
                        <div className="text-[13px] text-[var(--gold)] whitespace-pre-wrap">{answer}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
