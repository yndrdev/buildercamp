'use client'

import { useEffect, useState } from 'react'

interface SuccessScreenProps {
  clientId: string
  clientName: string
  sessionName: string
  respondentName: string
  respondentRole: string
  answers: Record<string, string>
  onSubmitAnother: () => void
}

export default function SuccessScreen({
  clientId,
  clientName,
  sessionName,
  respondentName,
  respondentRole,
  answers,
  onSubmitAnother,
}: SuccessScreenProps) {
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAcknowledgment() {
      try {
        const res = await fetch('/api/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            sessionGroupName: sessionName,
            respondentName,
            respondentRole,
            answers,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setAiMessage(data.message)
        }
      } catch {
        // Graceful fallback — show static message
      } finally {
        setLoading(false)
      }
    }
    fetchAcknowledgment()
  }, [clientId, sessionName, respondentName, respondentRole, answers])

  return (
    <div className="text-center py-12 animate-fade-in">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full bg-[#E8703A]/10 border-2 border-[#E8703A] flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[#E8703A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-[#F5F5F0] mb-3">
        Response Submitted
      </h2>
      <p className="text-[#9CA3AF] mb-2 max-w-md mx-auto">
        Your intake for <span className="text-[#D4A574]">{sessionName}</span> has been recorded.
      </p>

      {/* AI personalized message */}
      {loading ? (
        <div className="my-8 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-[#6B7280] text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E8703A] animate-pulse" />
            <span>Personalizing your response...</span>
          </div>
        </div>
      ) : aiMessage ? (
        <div className="my-8 max-w-md mx-auto text-left">
          <div className="border-l-[3px] border-[#E8703A] pl-4 py-2">
            <p className="text-[#E8E6E1] text-sm leading-relaxed">{aiMessage}</p>
          </div>
        </div>
      ) : (
        <p className="text-[#6B7280] text-sm mb-8 max-w-md mx-auto">
          Chris will review your responses before the {clientName} session to tailor the workshop to your team.
        </p>
      )}

      <button
        onClick={onSubmitAnother}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#212D3B] border border-[#2A3544] text-[#E8E6E1] hover:border-[#E8703A] hover:text-[#E8703A] transition-all duration-200 text-sm"
      >
        &larr; Submit for another session
      </button>
    </div>
  )
}
