'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Plus, Users, ChatDots, Link as LinkIcon, Spinner, X } from '@phosphor-icons/react'

const ADMIN_PIN = 'yndr'

interface Client {
  id: string; slug: string; name: string; logo_url: string | null
  created_at: string; conversationCount: number; submissionCount: number
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
  const [newDomains, setNewDomains] = useState('')
  const [creating, setCreating] = useState(false)

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
      body: JSON.stringify({ name: newName.trim(), slug, sessionGroups: sessions, roles, allowedDomains: newDomains.trim() }),
    })

    setNewName(''); setNewSlug(''); setNewSessions(''); setNewRoles(''); setNewDomains('')
    setShowCreate(false)
    setCreating(false)
    fetchClients()
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
                <div>
                  <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Allowed Email Domains (comma-separated)</label>
                  <input value={newDomains} onChange={(e) => setNewDomains(e.target.value)}
                    placeholder="company.com, subsidiary.com"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40" />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Users with these email domains can request access via magic link</p>
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
            <a key={client.id} href={`/admin/${client.slug}`}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, borderColor: 'rgba(242, 101, 72, 0.3)' }}
                className="border border-[var(--border)] rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 cursor-pointer transition-all">
                <div className="flex items-start justify-between mb-3">
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
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <ChatDots weight="bold" className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">{client.conversationCount} conversation{client.conversationCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users weight="bold" className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">{client.submissionCount} form{client.submissionCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </motion.div>
            </a>
          ))}
        </div>
      )}

    </div>
  )
}
