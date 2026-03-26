'use client'

interface SuccessScreenProps {
  clientName: string
  sessionName: string
  onSubmitAnother: () => void
}

export default function SuccessScreen({ clientName, sessionName, onSubmitAnother }: SuccessScreenProps) {
  return (
    <div className="text-center py-12 animate-fade-in">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full bg-[var(--accent)] bg-opacity-10 border-2 border-[var(--accent)] flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-[var(--white)] mb-3">
        Response Submitted
      </h2>
      <p className="text-[var(--text-secondary)] mb-2 max-w-md mx-auto">
        Your intake for <span className="text-[var(--gold)]">{sessionName}</span> has been recorded.
      </p>
      <p className="text-[var(--text-muted)] text-sm mb-8 max-w-md mx-auto">
        Chris will review your responses before the {clientName} session to tailor the workshop to your team.
      </p>

      <button
        onClick={onSubmitAnother}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--card)] border border-[var(--divider)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 text-sm"
      >
        &larr; Submit for another session
      </button>
    </div>
  )
}
