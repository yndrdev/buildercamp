import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

interface Props {
  params: { token: string }
}

export const revalidate = 0

export default async function SharedReportPage({ params }: Props) {
  const { token } = params

  const { data: report } = await supabase
    .from('shared_reports')
    .select('*')
    .eq('token', token)
    .single()

  if (!report) notFound()

  // Check expiry
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return (
      <div className="max-w-[700px] mx-auto px-6 pt-20 text-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Report Expired</h1>
        <p className="text-[var(--text-muted)] text-[14px]">This report link has expired. Please contact your YNDR representative for an updated link.</p>
      </div>
    )
  }

  const c = report.content as {
    clientName: string
    generatedAt: string
    stats: { total: number; completed: number; inProgress: number }
    participants: { name: string; role: string; status: string; questionCount: number }[]
    executiveSummary: string
    analyses: { name: string; role: string; summary?: string; themes?: string[]; tasks?: { title: string; description: string; priority: string }[]; prep_notes?: string }[]
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/avatar.svg" alt="" className="w-10 h-10 rounded-full" />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">{c.clientName}</h1>
          <p className="text-[12px] text-[var(--text-muted)]">BuilderCamp Intake Report</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[24px] font-bold text-[var(--text-primary)]">{c.stats.total}</div>
          <div className="text-[11px] text-[var(--text-muted)]">Participants</div>
        </div>
        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[24px] font-bold text-[var(--text-primary)]">{c.stats.completed}</div>
          <div className="text-[11px] text-[var(--text-muted)]">Completed</div>
        </div>
        <div className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[24px] font-bold text-[var(--text-primary)]">{c.stats.inProgress}</div>
          <div className="text-[11px] text-[var(--text-muted)]">In Progress</div>
        </div>
      </div>

      {/* Executive Summary */}
      {c.executiveSummary && (
        <div className="mb-8">
          <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Executive Summary</h2>
          <div className="p-5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">{c.executiveSummary}</p>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="mb-8">
        <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Participants</h2>
        <div className="border border-[var(--border)] rounded-[12px] overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-[var(--surface-elevated)] text-[10px] font-bold tracking-[0.08em] uppercase text-[var(--text-muted)]">
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Questions</div>
          </div>
          {c.participants.map((p, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-[var(--border)]">
              <div className="text-[13px] text-[var(--text-primary)]">{p.name}</div>
              <div className="text-[12px] text-[var(--text-secondary)]">{p.role}</div>
              <div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {p.status === 'completed' ? 'Complete' : 'In Progress'}
                </span>
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">{p.questionCount} answered</div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Analyses */}
      {c.analyses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Individual Insights</h2>
          <div className="space-y-3">
            {c.analyses.map((a, i) => (
              <div key={i} className="p-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--coral)] font-bold text-[10px]">
                    {(a.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">{a.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{a.role}</div>
                  </div>
                </div>
                {a.summary && <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">{a.summary}</p>}
                {a.themes && a.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {a.themes.map((t, ti) => (
                      <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)]">{t}</span>
                    ))}
                  </div>
                )}
                {a.prep_notes && (
                  <div className="border-l-2 border-[var(--coral)] pl-3">
                    <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block mb-1">Notes</span>
                    <p className="text-[11px] text-[var(--text-secondary)]">{a.prep_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-8 border-t border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-muted)]">
          Generated {new Date(c.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} by BuilderCamp
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">Powered by YNDR</p>
      </div>
    </div>
  )
}
