'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowLeft, Lightning, ChatDots, FileText, CaretDown, CaretUp, Spinner, Link as LinkIcon, ArrowSquareOut, UserPlus, Upload, Trash, UsersThree } from '@phosphor-icons/react'
import Papa from 'papaparse'

const ADMIN_PIN = 'yndr'

interface Conversation {
  id: string; respondent_name: string | null; respondent_role: string | null
  session_group_id: string | null; status: string; started_at: string
  completed_at: string | null
  messages: { role: string; content: string }[]
  analysis: { summary?: string; themes?: string[]; tasks?: { title: string; description: string; priority: string }[]; prep_notes?: string } | null
}

interface Submission {
  id: string; respondent_name: string; respondent_email: string
  respondent_role: string | null; session_group_id: string
  answers: Record<string, string>; submitted_at: string
}

interface SessionGroup { id: string; name: string }
interface Question { id: string; session_group_id: string; label: string }

interface ClientUser {
  id: string; email: string; name: string | null; role: string | null
  department: string | null; status: string; invited_at: string
}

interface ActionPlan {
  workshop_brief: string
  pain_points: { area: string; description: string; affected_roles: string[]; priority: string }[]
  action_items: { title: string; description: string; owner: string; timeline: string; prompt: string }[]
  quick_wins: { title: string; description: string; impact: string }[]
}

function checkAdminCookie() {
  return document.cookie.split(';').some((c) => c.trim().startsWith('bc_admin='))
}

function setAdminCookie() {
  document.cookie = 'bc_admin=1; path=/admin; max-age=86400; SameSite=Lax'
}

export default function AdminClientDetail() {
  const params = useParams()
  const clientSlug = params.clientSlug as string

  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    if (checkAdminCookie()) setAuthenticated(true)
  }, [])

  const [client, setClient] = useState<{ id: string; name: string; slug: string; allowed_domains: string[] } | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'conversations' | 'forms'>('users')
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (authenticated) fetchData()
  }, [authenticated, clientSlug])

  async function fetchData() {
    setLoading(true)
    // Fetch client data via the admin API
    const clientsRes = await fetch('/api/admin/clients')
    const clientsData = await clientsRes.json()
    const match = (clientsData.clients || []).find((c: { slug: string }) => c.slug === clientSlug)
    if (!match) { setLoading(false); return }
    setClient(match)

    // Fetch everything from Supabase via individual fetches
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }

    const [sgRes, qRes, convRes, subRes, usersRes] = await Promise.all([
      fetch(`${baseUrl}/rest/v1/session_groups?client_id=eq.${match.id}&order=sort_order`, { headers }),
      fetch(`${baseUrl}/rest/v1/questions?order=sort_order`, { headers }),
      fetch(`${baseUrl}/rest/v1/conversations?client_id=eq.${match.id}&order=started_at.desc`, { headers }),
      fetch(`${baseUrl}/rest/v1/submissions?client_id=eq.${match.id}&order=submitted_at.desc`, { headers }),
      fetch(`/api/admin/users?clientId=${match.id}`),
    ])

    setSessionGroups(await sgRes.json())
    setQuestions(await qRes.json())
    setConversations(await convRes.json())
    setSubmissions(await subRes.json())
    const usersData = await usersRes.json()
    setClientUsers(usersData.users || [])
    setLoading(false)
  }

  async function addSingleUser() {
    if (!client || !newUserEmail.includes('@')) return
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, users: [{ email: newUserEmail, name: newUserName, role: newUserRole }] }),
    })
    setNewUserEmail(''); setNewUserName(''); setNewUserRole(''); setShowAddUser(false)
    const res = await fetch(`/api/admin/users?clientId=${client.id}`)
    const data = await res.json()
    setClientUsers(data.users || [])
  }

  async function handleCsvUpload(file: File) {
    if (!client) return
    setUploading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const users = (results.data as Record<string, string>[]).map((row) => ({
          email: row.email || row.Email || row.EMAIL || '',
          name: row.name || row.Name || row.NAME || row['Full Name'] || row['full name'] || '',
          role: row.role || row.Role || row.ROLE || row.title || row.Title || row['Job Title'] || '',
          department: row.department || row.Department || row.DEPARTMENT || '',
        })).filter((u: { email: string }) => u.email.includes('@'))

        if (users.length > 0) {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: client.id, users }),
          })
          const res = await fetch(`/api/admin/users?clientId=${client.id}`)
          const data = await res.json()
          setClientUsers(data.users || [])
        }
        setUploading(false)
      },
      error: () => setUploading(false),
    })
  }

  async function removeUser(userId: string) {
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setClientUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  async function generateActionPlan() {
    if (!client) return
    setGeneratingPlan(true)
    const res = await fetch('/api/admin/action-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    })
    const data = await res.json()
    if (data.plan) setActionPlan(data.plan)
    setGeneratingPlan(false)
  }

  // PIN gate
  if (!authenticated) {
    return (
      <div className="max-w-[400px] mx-auto px-6 pt-[120px]">
        <div className="text-center mb-8">
          <Lock weight="bold" className="w-6 h-6 text-[var(--coral)] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">Admin Access</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (pin === ADMIN_PIN) { setAdminCookie(); setAuthenticated(true) } else { setPinError(true); setPin('') } }}>
          <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false) }}
            placeholder="Enter PIN" autoFocus
            className={`w-full bg-[var(--surface)] border ${pinError ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] px-4 py-3 text-center text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/40 mb-3`} />
          {pinError && <p className="text-red-400 text-[12px] text-center mb-3">Incorrect PIN</p>}
          <button type="submit" className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--coral)] text-white font-medium text-[14px] hover:bg-[var(--coral-light)] transition-colors">Enter</button>
        </form>
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center py-32"><Spinner weight="bold" className="w-6 h-6 text-[var(--coral)] animate-spin" /></div>
  }

  if (!client) {
    return <div className="text-center py-32 text-[var(--text-muted)]">Client not found</div>
  }

  const totalResponses = conversations.length + submissions.length

  return (
    <div className="max-w-[1000px] mx-auto px-6 pt-12 pb-16">
      {/* Header */}
      <a href="/admin" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--coral)] mb-6 transition-colors">
        <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> All Clients
      </a>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--coral)] font-mono">
              <LinkIcon weight="bold" className="w-3 h-3" /> /{client.slug}
            </span>
            {client.allowed_domains?.length > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">
                Domains: {client.allowed_domains.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/${client.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-full)] text-[12px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--coral)]/30 transition-all">
            Open Intake <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
          </a>
          <button onClick={generateActionPlan} disabled={generatingPlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-full)] text-[12px] font-medium bg-[var(--coral)] text-white hover:bg-[var(--coral-light)] disabled:opacity-50 transition-colors shadow-[var(--shadow-coral)]">
            {generatingPlan ? <Spinner weight="bold" className="w-3.5 h-3.5 animate-spin" /> : <Lightning weight="fill" className="w-3.5 h-3.5" />}
            Generate Action Plan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total Responses', value: totalResponses },
          { label: 'Conversations', value: conversations.length },
          { label: 'Completed', value: conversations.filter((c) => c.status === 'completed').length },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[24px] font-bold text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-[11px] text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Action Plan */}
      <AnimatePresence>
        {actionPlan && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 border border-[var(--coral)]/20 rounded-[var(--radius-xl)] bg-[var(--surface)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
              <Lightning weight="fill" className="w-4 h-4 text-[var(--coral)]" />
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Action Plan</h2>
            </div>
            <div className="p-5 space-y-5">
              {actionPlan.workshop_brief && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-2">Workshop Brief</h3>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{actionPlan.workshop_brief}</p>
                </div>
              )}
              {actionPlan.quick_wins?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-2">Quick Wins</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {actionPlan.quick_wins.map((w, i) => (
                      <div key={i} className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{w.title}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{w.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {actionPlan.action_items?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] mb-2">Action Items</h3>
                  <div className="space-y-2">
                    {actionPlan.action_items.map((item, i) => (
                      <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)] overflow-hidden">
                        <div className="p-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{item.timeline}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mb-2">{item.description}</div>
                          {item.prompt && (
                            <button onClick={() => setExpandedPrompt(expandedPrompt === i ? null : i)}
                              className="flex items-center gap-1 text-[11px] font-medium text-[var(--coral)]">
                              <Lightning weight="fill" className="w-3 h-3" />
                              {expandedPrompt === i ? 'Hide' : 'View'} Prompt
                              {expandedPrompt === i ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {expandedPrompt === i && item.prompt && (
                          <div className="border-t border-[var(--border)] p-3 bg-[var(--bg)]">
                            <pre className="text-[11px] text-[var(--gold)] whitespace-pre-wrap font-mono leading-relaxed">{item.prompt}</pre>
                            <button onClick={() => navigator.clipboard.writeText(item.prompt)} className="mt-2 text-[10px] text-[var(--coral)]">Copy</button>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium transition-all ${activeTab === 'users' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
          <UsersThree weight="bold" className="w-3.5 h-3.5" /> Users ({clientUsers.length})
        </button>
        <button onClick={() => setActiveTab('conversations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium transition-all ${activeTab === 'conversations' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
          <ChatDots weight="bold" className="w-3.5 h-3.5" /> Conversations ({conversations.length})
        </button>
        <button onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium transition-all ${activeTab === 'forms' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
          <FileText weight="bold" className="w-3.5 h-3.5" /> Forms ({submissions.length})
        </button>
      </div>

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          {/* Actions bar */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-full)] text-[12px] font-medium bg-[var(--coral)] text-white hover:bg-[var(--coral-light)] transition-colors">
              <UserPlus weight="bold" className="w-3.5 h-3.5" /> Add User
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-full)] text-[12px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--coral)]/30 cursor-pointer transition-all">
              <Upload weight="bold" className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload CSV'}
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvUpload(file)
                e.target.value = ''
              }} />
            </label>
            <span className="text-[11px] text-[var(--text-muted)] ml-2">CSV columns: email, name, role, department</span>
          </div>

          {/* Add user inline form */}
          <AnimatePresence>
            {showAddUser && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden">
                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Name</label>
                    <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Jane Smith"
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--coral)]/30" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Email *</label>
                    <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="jane@company.com" type="email"
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--coral)]/30" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Role</label>
                    <input value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} placeholder="VP of Sales"
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--coral)]/30" />
                  </div>
                  <button onClick={addSingleUser} disabled={!newUserEmail.includes('@')}
                    className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--coral)] text-white text-[12px] font-medium disabled:opacity-30 hover:bg-[var(--coral-light)] transition-colors shrink-0">
                    Add
                  </button>
                  <button onClick={() => setShowAddUser(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 p-2">
                    <CaretUp weight="bold" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Users list */}
          {clientUsers.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[14px]">
              No users yet. Add them manually or upload a CSV.
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[var(--surface-elevated)] text-[10px] font-bold tracking-[0.08em] uppercase text-[var(--text-muted)]">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1"></div>
              </div>
              {/* Rows */}
              {clientUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors items-center">
                  <div className="col-span-3 text-[13px] text-[var(--text-primary)] truncate">{user.name || '-'}</div>
                  <div className="col-span-3 text-[12px] text-[var(--text-secondary)] font-mono truncate">{user.email}</div>
                  <div className="col-span-2 text-[12px] text-[var(--text-secondary)] truncate">{user.role || '-'}</div>
                  <div className="col-span-2 text-[12px] text-[var(--text-muted)] truncate">{user.department || '-'}</div>
                  <div className="col-span-1">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-[var(--radius-full)] ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeUser(user.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1">
                      <Trash weight="bold" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations */}
      {activeTab === 'conversations' && (
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[14px]">No conversations yet.</div>
          ) : conversations.map((convo) => (
            <div key={convo.id} className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface)] overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === convo.id ? null : convo.id)}
                className="w-full text-left p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--coral)] font-bold text-[11px]">
                      {(convo.respondent_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{convo.respondent_name || 'Unknown'}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {convo.respondent_role || 'No role'}
                        {convo.session_group_id && ` / ${sessionGroups.find((sg) => sg.id === convo.session_group_id)?.name || ''}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-full)] ${convo.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {convo.status === 'completed' ? 'Complete' : 'In Progress'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">{new Date(convo.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {expandedId === convo.id ? <CaretUp className="w-4 h-4 text-[var(--text-muted)]" /> : <CaretDown className="w-4 h-4 text-[var(--text-muted)]" />}
                  </div>
                </div>
              </button>
              {expandedId === convo.id && (
                <div className="border-t border-[var(--border)]">
                  {convo.analysis && (
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--coral)]/3">
                      <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--coral)] block mb-2">AI Analysis</span>
                      {convo.analysis.summary && <p className="text-[12px] text-[var(--text-primary)] leading-relaxed mb-2">{convo.analysis.summary}</p>}
                      {convo.analysis.themes && convo.analysis.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {convo.analysis.themes.map((t, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">{t}</span>)}
                        </div>
                      )}
                      {convo.analysis.prep_notes && (
                        <div className="border-l-2 border-[var(--coral)] pl-3 mt-2">
                          <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block mb-1">Prep Notes</span>
                          <p className="text-[11px] text-[var(--text-secondary)]">{convo.analysis.prep_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] block mb-2">Transcript</span>
                    {(convo.messages || []).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] text-[11px] leading-relaxed px-3 py-2 rounded-[var(--radius-md)] ${msg.role === 'user' ? 'bg-[var(--coral)]/10 text-[var(--text-primary)]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>
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

      {/* Forms */}
      {activeTab === 'forms' && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-[14px]">No form submissions.</div>
          ) : submissions.map((sub) => (
            <div key={sub.id} className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--surface)] overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="w-full text-left p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">{sub.respondent_name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{sub.respondent_email}</div>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">{new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </button>
              {expandedId === sub.id && (
                <div className="border-t border-[var(--border)] p-4 space-y-3">
                  {questions.filter((q) => q.session_group_id === sub.session_group_id).map((q) => {
                    const answer = sub.answers[q.id]
                    if (!answer) return null
                    return (
                      <div key={q.id}>
                        <div className="text-[10px] text-[var(--text-muted)] mb-0.5">{q.label}</div>
                        <div className="text-[12px] text-[var(--gold)]">{answer}</div>
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
