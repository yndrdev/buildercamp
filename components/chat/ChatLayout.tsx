'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SessionGroup, QuestionSection, ChatMessage, ChatAttachment } from '@/lib/types'
import ChatSidebar from './ChatSidebar'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import SuggestionChips from './SuggestionChips'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

async function persistPatch(conversationId: string, data: Record<string, unknown>, retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, ...data }),
      })
      if (res.ok) return true
    } catch { /* retry */ }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
  }
  console.error('[BuilderCamp] Failed to save phase data after retries:', data)
  return false
}

interface Props {
  clientId: string
  clientName: string
  userEmail?: string | null
}

type Phase = 'loading' | 'name' | 'role' | 'session' | 'questions' | 'complete'

export default function ChatLayout({ clientId, clientName, userEmail }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [phase, setPhase] = useState<Phase>('loading')
  const [roles, setRoles] = useState<string[]>([])
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  const [questionsByGroup, setQuestionsByGroup] = useState<Record<string, QuestionSection[]>>({})
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [answeredIds, setAnsweredIds] = useState<string[]>([])
  const [respondentName, setRespondentName] = useState<string | null>(null)
  const [respondentRole, setRespondentRole] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, userEmail }),
      })
      const data = await res.json()
      setConversationId(data.conversationId)
      setRoles(data.roles)
      setSessionGroups(data.sessionGroups)
      setQuestionsByGroup(data.questionsByGroup)

      if (data.resumed) {
        // Restore existing conversation
        setMessages(data.existingMessages || [])
        setRespondentName(data.respondentName || null)
        setRespondentRole(data.respondentRole || null)
        setAnsweredIds(data.answeredQuestionIds || [])
        if (data.sessionGroupId) {
          setSelectedSessionId(data.sessionGroupId)
        }
        // Determine phase from existing state
        if (data.existingStatus === 'completed') {
          setPhase('complete')
        } else if (data.sessionGroupId) {
          setPhase('questions')
        } else if (data.respondentRole) {
          setPhase('session')
        } else if (data.respondentName) {
          setPhase('role')
        } else {
          setPhase('name')
        }
      } else {
        // New conversation
        setMessages([{ role: 'assistant', content: data.greeting, timestamp: new Date().toISOString() }])
        setPhase('name')
      }
    }
    init()
  }, [clientId, userEmail])

  const sendMessage = useCallback(async (text: string, attachments?: ChatAttachment[]) => {
    if (!conversationId || isStreaming || (!text.trim() && !attachments?.length)) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString(), attachments }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Phase transitions — awaited with retry to prevent data loss
    if (phase === 'name' && !respondentName) {
      const name = text.trim().replace(/^(my name is |i'm |i am |hi,? i'm |hey,? i'm )/i, '').replace(/[.!]$/, '').trim()
      setRespondentName(name)
      setPhase('role')
      await persistPatch(conversationId, { respondentName: name })
    } else if (phase === 'role' && !respondentRole) {
      const roleName = text.trim()
      setRespondentRole(roleName)
      setPhase('session')
      await persistPatch(conversationId, { respondentRole: roleName })
    } else if (phase === 'session' && !selectedSessionId) {
      const match = sessionGroups.find((sg) =>
        text.toLowerCase().includes(sg.name.toLowerCase()) || sg.name.toLowerCase().includes(text.toLowerCase())
      )
      if (match) {
        setSelectedSessionId(match.id)
        setPhase('questions')
        await persistPatch(conversationId, { sessionGroupId: match.id })
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, clientId, message: text.trim() }),
      })

      if (!res.body) { setIsStreaming(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString() }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        const cleanText = fullText.replace(/<!--ANSWERED:[^>]+-->/g, '').replace(/<!--COMPLETE-->/g, '').trim()
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: cleanText }
          return updated
        })
      }

      const markers: string[] = []
      const re = /<!--ANSWERED:([^>]+)-->/g
      let m: RegExpExecArray | null
      while ((m = re.exec(fullText)) !== null) markers.push(m[1])
      if (markers.length > 0) {
        setAnsweredIds((prev) => Array.from(new Set([...prev, ...markers])))
      }

      if (fullText.includes('<!--COMPLETE-->')) {
        setPhase('complete')
        // Persist analysis with retry — do not fire-and-forget
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const analyzeRes = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId }),
            })
            if (analyzeRes.ok) break
          } catch { /* retry */ }
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1].content) {
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Something went wrong. Please try again.' }
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [conversationId, clientId, isStreaming, phase, respondentName, respondentRole, selectedSessionId, sessionGroups])

  const getChips = (): string[] | null => {
    if (isStreaming) return null
    if (phase === 'role') return roles
    if (phase === 'session') return sessionGroups.map((sg) => sg.name)
    return null
  }

  const currentSections = selectedSessionId ? questionsByGroup[selectedSessionId] || [] : []

  return (
    <SidebarProvider defaultOpen={false}>
      <ChatSidebar
        clientName={clientName}
        phase={phase}
        respondentName={respondentName}
        respondentRole={respondentRole}
        sessionName={sessionGroups.find((sg) => sg.id === selectedSessionId)?.name || null}
        sections={currentSections}
        answeredIds={answeredIds}
      />
      <SidebarInset className="flex flex-col min-h-[100dvh]">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10">
          <SidebarTrigger className="text-[var(--text-muted)] hover:text-[var(--text-primary)] -ml-1" />
          <div className="w-px h-5 bg-[var(--border)]" />
          <div className="flex-1">
            <h1 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{clientName}</h1>
          </div>
          <AnimatePresence>
            {phase === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--coral)] bg-[var(--coral)]/8 px-3 py-1.5 rounded-[var(--radius-full)]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--coral)]" />
                Complete
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {phase === 'loading' ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                className="w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--gold)] to-[var(--coral)] flex items-center justify-center text-[11px] font-bold text-white"
                animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                BC
              </motion.div>
            </div>
          ) : (
            <ChatMessages messages={messages} isStreaming={isStreaming} />
          )}
        </div>

        {/* Chips + Input */}
        <div className="px-4 md:px-10 pb-6 pt-2 space-y-3 relative z-20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <AnimatePresence>
            {getChips() && (
              <SuggestionChips options={getChips()!} onSelect={sendMessage} />
            )}
          </AnimatePresence>
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming || phase === 'loading'}
            conversationId={conversationId}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
