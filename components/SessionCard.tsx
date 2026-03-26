'use client'

interface SessionCardProps {
  index: number
  name: string
  description: string | null
  onClick: () => void
}

export default function SessionCard({ index, name, description, onClick }: SessionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-[var(--divider)] rounded-lg bg-[var(--card)] p-5 hover:border-[var(--accent)] hover:translate-y-[-1px] transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        {/* Left accent strip */}
        <div className="w-[3px] self-stretch rounded-full bg-[var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[var(--text-muted)] text-xs font-mono">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors text-lg">
              &rarr;
            </span>
          </div>
          <h3 className="text-[var(--white)] font-medium text-lg mb-1">{name}</h3>
          {description && (
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </button>
  )
}
