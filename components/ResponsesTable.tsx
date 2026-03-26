'use client'

import { useState } from 'react'

interface SessionGroup {
  id: string
  name: string
}

interface Question {
  id: string
  session_group_id: string
  label: string
}

interface Submission {
  id: string
  session_group_id: string
  respondent_name: string
  respondent_email: string
  respondent_role: string | null
  answers: Record<string, string>
  submitted_at: string
}

interface Props {
  sessionGroups: SessionGroup[]
  questions: Question[]
  submissions: Submission[]
}

export default function ResponsesTable({ sessionGroups, questions, submissions }: Props) {
  const [activeGroup, setActiveGroup] = useState(sessionGroups[0]?.id || '')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = submissions
    .filter((s) => s.session_group_id === activeGroup)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

  const groupQuestions = questions.filter((q) => q.session_group_id === activeGroup)

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {sessionGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => { setActiveGroup(group.id); setExpandedId(null) }}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              activeGroup === group.id
                ? 'bg-[#E8703A] text-white'
                : 'bg-[#212D3B] text-[#9CA3AF] border border-[#2A3544] hover:border-[#E8703A] hover:text-[#E8E6E1]'
            }`}
          >
            {group.name}
            <span className="ml-2 opacity-60">
              ({submissions.filter((s) => s.session_group_id === group.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6B7280]">
          No submissions yet for this session.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div key={sub.id} className="border border-[#2A3544] rounded-lg bg-[#212D3B] overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="w-full text-left p-5 hover:bg-[#1A2332]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#1A2332] flex items-center justify-center text-[#E8703A] font-bold text-xs">
                      {sub.respondent_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[#F5F5F0] font-medium text-sm">{sub.respondent_name}</div>
                      <div className="text-[#6B7280] text-xs">
                        {sub.respondent_email}
                        {sub.respondent_role && <span> &middot; {sub.respondent_role}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#6B7280] text-xs font-mono">
                      {new Date(sub.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`text-[#6B7280] transition-transform duration-200 ${expandedId === sub.id ? 'rotate-180' : ''}`}>
                      &#9662;
                    </span>
                  </div>
                </div>
              </button>

              {expandedId === sub.id && (
                <div className="border-t border-[#2A3544] p-5 space-y-4">
                  {groupQuestions.map((q) => {
                    const answer = sub.answers[q.id]
                    if (!answer) return null
                    return (
                      <div key={q.id}>
                        <div className="text-[#9CA3AF] text-xs mb-1">{q.label}</div>
                        <div className="text-[#D4A574] text-sm whitespace-pre-wrap">{answer}</div>
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
