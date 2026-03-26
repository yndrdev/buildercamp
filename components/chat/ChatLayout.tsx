'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SessionGroup, QuestionSection, ChatMessage } from '@/lib/types'
import ChatSidebar from './ChatSidebar'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import SuggestionChips from './SuggestionChips'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface Props {
  clientId: string
  clientName: string
}

type Phase = 'loading' | 'name' | 'role' | 'session' | 'questions' | 'complete'

export default function ChatLayout({ clientId, clientName }: Props) {
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

  // Initialize conversation
  useEffect(() => {
    async function init() {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      setConversationId(data.conversationId)
      setMessages([{ role: 'assistant', content: data.greeting, timestamp: new Date().toISOString() }])
      setRoles(data.roles)
      setSessionGroups(data.sessionGroups)
      setQuestionsByGroup(data.questionsByGroup)
      setPhase('name')
    }
    init()
  }, [clientId])

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || isStreaming || !text.trim()) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Detect phase transitions from user input
    if (phase === 'name' && !respondentName) {
      const name = text.trim().replace(/^(my name is |i'm |i am |hi,? i'm |hey,? i'm )/i, '').replace(/[.!]$/, '').trim()
      setRespondentName(name)
      setPhase('role')
      // Persist name to DB
      fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, respondentName: name }),
      }).catch(() => {})
    } else if (phase === 'role' && !respondentRole) {
      const roleName = text.trim()
      setRespondentRole(roleName)
      setPhase('session')
      // Persist role to DB
      fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, respondentRole: roleName }),
      }).catch(() => {})
    } else if (phase === 'session' && !selectedSessionId) {
      // Match session by name
      const match = sessionGroups.find((sg) =>
        text.toLowerCase().includes(sg.name.toLowerCase()) || sg.name.toLowerCase().includes(text.toLowerCase())
      )
      if (match) {
        setSelectedSessionId(match.id)
        setPhase('questions')
        // Persist session to DB
        fetch('/api/chat', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, sessionGroupId: match.id }),
        }).catch(() => {})
      }
    }

    // Stream response
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, clientId, message: text.trim() }),
      })

      if (!res.body) {
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      // Add empty assistant message to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString() }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        // Strip markers before display
        const cleanText = fullText.replace(/<!--ANSWERED:[^>]+-->/g, '').replace(/<!--COMPLETE-->/g, '').trim()
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: cleanText }
          return updated
        })
      }

      // Extract answered markers
      const markers: string[] = []
      const re = /<!--ANSWERED:([^>]+)-->/g
      let m: RegExpExecArray | null
      while ((m = re.exec(fullText)) !== null) markers.push(m[1])
      if (markers.length > 0) {
        setAnsweredIds((prev) => Array.from(new Set([...prev, ...markers])))
      }

      if (fullText.includes('<!--COMPLETE-->')) {
        setPhase('complete')
        // Trigger analysis
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        }).catch(() => {})
      }
    } catch {
      // Network error — show error message
      setMessages((prev) => {
        const updated = [...prev]
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1].content) {
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Sorry, something went wrong. Please try again.' }
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [conversationId, clientId, isStreaming, phase, respondentName, respondentRole, selectedSessionId, sessionGroups])

  // Get current suggestion chips
  const getChips = (): string[] | null => {
    if (isStreaming) return null
    if (phase === 'role') return roles
    if (phase === 'session') return sessionGroups.map((sg) => sg.name)
    return null
  }

  // Get current question sections for sidebar
  const currentSections = selectedSessionId ? questionsByGroup[selectedSessionId] || [] : []

  return (
    <SidebarProvider>
      <ChatSidebar
        clientName={clientName}
        phase={phase}
        respondentName={respondentName}
        respondentRole={respondentRole}
        sessionName={sessionGroups.find((sg) => sg.id === selectedSessionId)?.name || null}
        sections={currentSections}
        answeredIds={answeredIds}
      />
      <SidebarInset className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A3544]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8703A] to-[#D4A574] flex items-center justify-center text-xs font-bold text-white">
            BC
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#F5F5F0]" style={{ fontFamily: 'Georgia, serif' }}>{clientName}</h1>
            <p className="text-xs text-[#6B7280]">Pre-Session Intake</p>
          </div>
          {phase === 'complete' && (
            <span className="ml-auto text-xs text-[#E8703A] font-medium px-2 py-1 rounded-full border border-[#E8703A]/30 bg-[#E8703A]/10">
              Complete
            </span>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages messages={messages} isStreaming={isStreaming} />
        </div>

        {/* Suggestion chips */}
        {getChips() && (
          <div className="px-6 pb-2">
            <SuggestionChips options={getChips()!} onSelect={sendMessage} />
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6">
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming || phase === 'loading' || phase === 'complete'}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
