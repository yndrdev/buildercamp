'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Plus, ArrowRight, Lightning, Users, ChatDots, CaretDown, CaretUp, Link as LinkIcon, Spinner, X } from '@phosphor-icons/react'

const ADMIN_PIN = 'yndr'

interface Client {
  id: string; slug: string; name: string; logo_url: string | null
  created_at: string; conversationCount: number; submissionCount: number
}

interface ActionPlan {
  workshop_brief: string
  pain_points: { area: string; description: string; affected_roles: string[]; priority: string }[]
  action_items: { title: string; description: string; owner: string; timeline: string; prompt: string }[]
  session_recommendations: { session: string; focus_areas: string[]; demo_ideas: string[]; customization_notes: string }[]
  quick_wins: { title: string; description: string; impact: string }[]
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newSessions, setNewSessions] = useState('')
  const [newRoles, setNewRoles] = useState('')
  const [creating, setCreating] = useState(false)
  const [actionPlan, setActionPlan] = useState<{ clientId: string; plan: ActionPlan; count: number } | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState<string | null>(null)
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null)

  useEffect(() => {
    if (authenticated) fetchClients()
  }, [authenticated])

  async function fetchClients() {
    setLoading(true)
    const res = await fetch('/api/admin/clients')
    const data = await res.json()
    setClients(data.clients || [])
    setLoading(false)
  }

  async function createClient() {
    if (!newName.trim()) return
    setCreating(true)
    const slug = newSlug.trim() || newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const sessions = newSessions.split('\n').filter(Boolean).map((line) => {
      const [name, ...rest] = line.split(':')
      return { name: name.trim(), description: rest.join(':').trim() || undefined }
    })
    const roles = newRoles.split('\n').filter(Boolean).map((r) => r.trim())

    await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), slug, sessionGroups: sessions, roles }),
    })

    setNewName(''); setNewSlug(''); setNewSessions(''); setNewRoles('')
    setShowCreate(false)
    setCreating(false)
    fetchClients()
  }

  async function generateActionPlan(clientId: string) {
    setGeneratingPlan(clientId)
    setActionPlan(null)
    const res = await fetch('/api/admin/action-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const data = await res.json()
    if (data.plan) {
      setActionPlan({ clientId, plan: data.plan, count: data.participantCount })
    }
    setGeneratingPlan(null)
  }

  // PIN gate
  if (!authenticated) {
    return (
      <div className="max-w-[400px] mx-auto px-6 pt-[120px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <Lock weight="bold" className="w-5 h-5 text-[var(--coral)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">Admin Dashboard</h1>
          <p className="text-[13px] text-[var(--text-muted)]">BuilderCamp management</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (pin === ADMIN_PIN) setAuthenticated(true); else { setPinError(true); setPin('') } }}>
          <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false) }}
            placeholder="Enter PIN" autoFocus
            className={`w-full bg-[var(--surface)] border ${pinError ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] px-4 py-3 text-center text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40 mb-3`}
          />
          {pinError && <p className="text-red-400 text-[12px] text-center mb-3">Incorrect PIN</p>}
          <button type="submit" className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--coral)] text-white font-medium text-[14px] hover:bg-[var(--coral-light)] transition-colors">
            Enter
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 pt-12 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <img src="/avatar.svg" alt="" className="w-10 h-10 rounded-full" />
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">BuilderCamp</h1>
            <p className="text-[12px] text-[var(--text-muted)]">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-full)] bg-[var(--coral)] text-white text-[13px] font-medium hover:bg-[var(--coral-light)] transition-colors shadow-[var(--shadow-coral)]">
          <Plus weight="bold" className="w-4 h-4" /> New Client
        </button>
      </div>

      {/* Create client modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 w-full max-w-[480px] shadow-[var(--shadow-lg)]"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">New Client</h2>
                <button onClick={() => setShowCreate(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Company Name</label>
                  <input value={newName} onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) }}
                    placeholder="Big Green Egg" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40" />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">URL Slug</label>
                  <div className="flex items-center gap-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--coral)]/40">
                    <span className="text-[12px] text-[var(--text-muted)] pl-4 shrink-0">buildercamp.ai/</span>
                    <input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="big-green-egg" className="flex-1 bg-transparent py-2.5 pr-4 text-[14px] text-[var(--coral)] placeholder:text-[var(--text-muted)] focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Session Tracks (one per line, name:description)</label>
                  <textarea value={newSessions} onChange={(e) => setNewSessions(e.target.value)} rows={3}
                    placeholder={"Leadership: Strategy and planning\nEngineering: Technical deep-dive\nSales: Client engagement"}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40 resize-none" />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Roles (one per line)</label>
                  <textarea value={newRoles} onChange={(e) => setNewRoles(e.target.value)} rows={3}
                    placeholder={"CEO\nCTO\nVP of Engineering\nProduct Manager"}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40 resize-none" />
                </div>
                <button onClick={createClient} disabled={creating || !newName.trim()}
                  className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--coral)] text-white font-medium text-[14px] hover:bg-[var(--coral-light)] disabled:opacity-30 transition-colors">
                  {creating ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client cards */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner weight="bold" className="w-6 h-6 text-[var(--coral)] animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)] text-[14px]">No clients yet. Create your first one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {clients.map((client) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="border border-[var(--border)] rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 hover:border-[var(--coral)]/20 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">{client.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <LinkIcon weight="bold" className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[11px] text-[var(--coral)] font-mono">/{client.slug}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <ChatDots weight="bold" className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[12px] text-[var(--text-secondary)]">{client.conversationCount} conversation{client.conversationCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users weight="bold" className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[12px] text-[var(--text-secondary)]">{client.submissionCount} form{client.submissionCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a href={`/${client.slug}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] text-[11px] font-medium bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--coral)]/30 transition-all">
                  Intake <ArrowRight weight="bold" className="w-3 h-3" />
                </a>
                <a href={`/${client.slug}/responses`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] text-[11px] font-medium bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--coral)]/30 transition-all">
                  Responses
                </a>
                <button onClick={() => generateActionPlan(client.id)} disabled={generatingPlan === client.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] text-[11px] font-medium bg-[var(--coral)]/8 text-[var(--coral)] border border-[var(--coral)]/20 hover:bg-[var(--coral)]/15 disabled:opacity-50 transition-all">
                  {generatingPlan === client.id ? <Spinner weight="bold" className="w-3 h-3 animate-spin" /> : <Lightning weight="fill" className="w-3 h-3" />}
                  Action Plan
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Plan display */}
      <AnimatePresence>
        {actionPlan && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="border border-[var(--coral)]/20 rounded-[var(--radius-xl)] bg-[var(--surface)] overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightning weight="fill" className="w-5 h-5 text-[var(--coral)]" />
                  <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                    Action Plan ({clients.find((c) => c.id === actionPlan.clientId)?.name})
                  </h2>
                </div>
                <button onClick={() => setActionPlan(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">Based on {actionPlan.count} completed intake{actionPlan.count !== 1 ? 's' : ''}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Brief */}
              {actionPlan.plan.workshop_brief && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-2">Workshop Brief</h3>
                  <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{actionPlan.plan.workshop_brief}</p>
                </div>
              )}

              {/* Quick Wins */}
              {actionPlan.plan.quick_wins?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Quick Wins</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {actionPlan.plan.quick_wins.map((win, i) => (
                      <div key={i} className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{win.title}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{win.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pain Points */}
              {actionPlan.plan.pain_points?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Pain Points</h3>
                  <div className="space-y-2">
                    {actionPlan.plan.pain_points.map((pp, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${pp.priority === 'high' ? 'bg-[var(--coral)]/15 text-[var(--coral)]' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                          {pp.priority}
                        </span>
                        <div>
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{pp.area}</div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{pp.description}</div>
                          {pp.affected_roles?.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {pp.affected_roles.map((role, ri) => (
                                <span key={ri} className="text-[9px] px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">{role}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items with Prompts */}
              {actionPlan.plan.action_items?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-3">Action Items</h3>
                  <div className="space-y-2">
                    {actionPlan.plan.action_items.map((item, i) => (
                      <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)] overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                            <span className="text-[10px] text-[var(--text-muted)]">{item.timeline}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mb-2">{item.description}</div>
                          {item.prompt && (
                            <button onClick={() => setExpandedPrompt(expandedPrompt === i ? null : i)}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--coral)] hover:text-[var(--coral-light)]">
                              <Lightning weight="fill" className="w-3 h-3" />
                              {expandedPrompt === i ? 'Hide' : 'View'} Claude Prompt
                              {expandedPrompt === i ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {expandedPrompt === i && item.prompt && (
                          <div className="border-t border-[var(--border)] p-3 bg-[var(--bg)]">
                            <pre className="text-[12px] text-[var(--gold)] whitespace-pre-wrap font-mono leading-relaxed">{item.prompt}</pre>
                            <button onClick={() => navigator.clipboard.writeText(item.prompt)}
                              className="mt-2 text-[10px] font-medium text-[var(--coral)] hover:text-[var(--coral-light)]">
                              Copy to clipboard
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
