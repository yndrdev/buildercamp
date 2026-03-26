'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import SessionCard from './SessionCard'
import QuestionField from './QuestionField'
import SuccessScreen from './SuccessScreen'

interface Client {
  id: string
  slug: string
  name: string
  logo_url: string | null
}

interface SessionGroup {
  id: string
  client_id: string
  name: string
  description: string | null
  sort_order: number
}

interface Question {
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

interface Props {
  client: Client
  sessionGroups: SessionGroup[]
  questions: Question[]
  roles: string[]
}

type View = 'select' | 'form' | 'success'

export default function IntakeForm({ client, sessionGroups, questions, roles }: Props) {
  const [view, setView] = useState<View>('select')
  const [selectedGroup, setSelectedGroup] = useState<SessionGroup | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupQuestions = selectedGroup
    ? questions.filter((q) => q.session_group_id === selectedGroup.id)
    : []

  // Group questions by section_header
  const sections: { header: string | null; items: Question[] }[] = []
  for (const q of groupQuestions) {
    if (q.section_header && (sections.length === 0 || sections[sections.length - 1].header !== q.section_header)) {
      sections.push({ header: q.section_header, items: [q] })
    } else if (sections.length === 0) {
      sections.push({ header: null, items: [q] })
    } else {
      sections[sections.length - 1].items.push(q)
    }
  }

  const requiredMissing = () => {
    if (!name.trim() || !email.trim() || !role.trim()) return true
    for (const q of groupQuestions) {
      if (q.is_required && !answers[q.id]?.trim()) return true
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || requiredMissing()) return

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await supabase.from('submissions').insert({
      client_id: client.id,
      session_group_id: selectedGroup.id,
      respondent_name: name.trim(),
      respondent_email: email.trim(),
      respondent_role: role.trim() || null,
      answers,
    })

    setSubmitting(false)

    if (submitError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setView('success')
  }

  const handleSelectGroup = (group: SessionGroup) => {
    setSelectedGroup(group)
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setView('select')
    setSelectedGroup(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmitAnother = () => {
    setView('select')
    setSelectedGroup(null)
    setName('')
    setEmail('')
    setRole('')
    setAnswers({})
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-10 animate-fade-in">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8703A] to-[#D4A574] flex items-center justify-center text-xs font-bold text-white">
          BC
        </div>
        <span className="text-[#9CA3AF] text-sm tracking-wider uppercase">BuilderCamp</span>
      </div>

      {/* Client name */}
      <div className="mb-8 animate-fade-in stagger-1">
        <h1 className="text-3xl font-bold text-[#F5F5F0] mb-2">{client.name}</h1>
        <p className="text-[#9CA3AF]">Pre-Session Intake Form</p>
      </div>

      {/* Session Selection */}
      {view === 'select' && (
        <div>
          <p className="text-[#9CA3AF] text-sm mb-6 animate-fade-in stagger-2">
            Select the session track you&apos;ll be attending:
          </p>
          <div className="space-y-3">
            {sessionGroups.map((group, i) => (
              <div key={group.id} className="animate-fade-in stagger-3">
                <SessionCard
                  index={i}
                  name={group.name}
                  description={group.description}
                  onClick={() => handleSelectGroup(group)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {view === 'form' && selectedGroup && (
        <form onSubmit={handleSubmit}>
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#E8703A] text-sm mb-6 transition-colors animate-fade-in"
          >
            &larr; Back to sessions
          </button>

          {/* Selected session badge */}
          <div className="flex items-center gap-2 mb-8 animate-fade-in stagger-1">
            <div className="w-[3px] h-5 rounded-full bg-[#E8703A]" />
            <span className="text-[#E8703A] text-sm font-medium">{selectedGroup.name}</span>
          </div>

          {/* Your Info section */}
          <div className="mb-10 animate-fade-in stagger-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-[3px] h-4 rounded-full bg-[#E8703A]" />
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#E8703A]">
                Your Info
              </h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[#E8E6E1] text-sm font-medium mb-2">
                  Name <span className="text-[#E8703A]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#1E2D3D] border border-[#2A4054] rounded-lg px-4 py-3 text-[#D4A574] placeholder:text-[#6B7280] transition-all duration-200 text-sm"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-[#E8E6E1] text-sm font-medium mb-2">
                  Email <span className="text-[#E8703A]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1E2D3D] border border-[#2A4054] rounded-lg px-4 py-3 text-[#D4A574] placeholder:text-[#6B7280] transition-all duration-200 text-sm"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-[#E8E6E1] text-sm font-medium mb-2">
                  Title / Role <span className="text-[#E8703A]">*</span>
                </label>
                {roles.length > 0 ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full bg-[#1E2D3D] border border-[#2A4054] rounded-lg px-4 py-3 text-[#D4A574] transition-all duration-200 text-sm cursor-pointer"
                  >
                    <option value="">Select your role...</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full bg-[#1E2D3D] border border-[#2A4054] rounded-lg px-4 py-3 text-[#D4A574] placeholder:text-[#6B7280] transition-all duration-200 text-sm"
                    placeholder="e.g. VP of Engineering"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dynamic questions by section */}
          {sections.map((section, si) => (
            <div key={si} className="mb-10 animate-fade-in stagger-3">
              {section.header && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-[3px] h-4 rounded-full bg-[#E8703A]" />
                  <h2 className="text-xs font-bold tracking-widest uppercase text-[#E8703A]">
                    {section.header}
                  </h2>
                </div>
              )}
              <div className="space-y-5">
                {section.items.map((question) => (
                  <QuestionField
                    key={question.id}
                    question={question}
                    value={answers[question.id] || ''}
                    onChange={(val) => setAnswers((prev) => ({ ...prev, [question.id]: val }))}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || requiredMissing()}
            className="w-full py-3.5 rounded-lg bg-[#E8703A] text-white font-medium text-sm hover:bg-[#F09D6A] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>
      )}

      {/* Success */}
      {view === 'success' && selectedGroup && (
        <SuccessScreen
          clientId={client.id}
          clientName={client.name}
          sessionName={selectedGroup.name}
          respondentName={name}
          respondentRole={role}
          answers={answers}
          onSubmitAnother={handleSubmitAnother}
        />
      )}
    </div>
  )
}
