'use client'

import { motion } from 'framer-motion'
import { CheckCircle, User, Briefcase, Stack, ChatDots } from '@phosphor-icons/react'
import type { QuestionSection } from '@/lib/types'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

interface Props {
  clientName?: string
  phase: string
  respondentName: string | null
  respondentRole: string | null
  sessionName: string | null
  sections: QuestionSection[]
  answeredIds: string[]
}

export default function ChatSidebar({ phase, respondentName, respondentRole, sessionName, sections, answeredIds }: Props) {
  const answeredSet = new Set(answeredIds)
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)
  const totalAnswered = sections.reduce((sum, s) => sum + s.questions.filter((q) => answeredSet.has(q.id)).length, 0)
  // Progress: meta steps (name/role/session) = 30%, questions = 70%
  // This prevents progress from going backwards when session is selected
  const metaSteps = [!!respondentName, !!respondentRole, !!sessionName].filter(Boolean).length
  const metaProgress = (metaSteps / 3) * 30
  const questionProgress = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 70 : 0
  const overallProgress = Math.round(metaProgress + questionProgress)

  return (
    <Sidebar className="border-r border-[var(--border)]">
      <SidebarHeader className="p-5 pb-4">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--gold)] to-[var(--coral)] flex items-center justify-center text-[10px] font-bold text-white tracking-tight shadow-[var(--shadow-coral)]">
            BC
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">BuilderCamp</div>
            <div className="text-[11px] text-[var(--text-muted)]">Pre-Session Intake</div>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-4 p-3.5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-elevated)" strokeWidth="3" />
              <motion.circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="var(--coral)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="97.39"
                initial={{ strokeDashoffset: 97.39 }}
                animate={{ strokeDashoffset: 97.39 - (97.39 * overallProgress) / 100 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)]">
              {overallProgress}%
            </span>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">Progress</div>
            <div className="text-[11px] text-[var(--text-muted)]">{totalQuestions > 0 ? `${totalAnswered} of ${totalQuestions} questions` : `Step ${metaSteps} of 3`}</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Meta: Name, Role, Session */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] px-3">Getting Started</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { done: !!respondentName, active: phase === 'name', icon: User, label: respondentName || 'Your name', },
                { done: !!respondentRole, active: phase === 'role', icon: Briefcase, label: respondentRole || 'Your role', },
                { done: !!sessionName, active: phase === 'session', icon: Stack, label: sessionName || 'Session track', },
              ].map((item, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuButton className="gap-3 py-2.5 rounded-[var(--radius-md)]">
                    {item.done ? (
                      <CheckCircle weight="fill" className="w-[16px] h-[16px] text-[var(--coral)] shrink-0" />
                    ) : (
                      <item.icon
                        weight={item.active ? 'fill' : 'regular'}
                        className={`w-[16px] h-[16px] shrink-0 ${item.active ? 'text-[var(--coral)]' : 'text-[var(--text-muted)]'}`}
                      />
                    )}
                    <span className={`text-[13px] truncate ${
                      item.done ? 'text-[var(--text-primary)] font-medium' : item.active ? 'text-[var(--coral)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {item.label}
                    </span>
                    {item.active && !item.done && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-[var(--coral)] ml-auto shrink-0"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Question sections */}
        {sections.map((section, si) => {
          const sectionAnswered = section.questions.filter((q) => answeredSet.has(q.id)).length
          return (
            <SidebarGroup key={si}>
              <SidebarGroupLabel className="flex items-center justify-between px-3">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--coral)]">
                  {section.header || 'Questions'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {sectionAnswered}/{section.questions.length}
                </span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.questions.map((q) => {
                    const isAnswered = answeredSet.has(q.id)
                    return (
                      <SidebarMenuItem key={q.id}>
                        <SidebarMenuButton className="gap-3 py-2 rounded-[var(--radius-sm)]">
                          {isAnswered ? (
                            <CheckCircle weight="fill" className="w-[14px] h-[14px] text-[var(--coral)] shrink-0 opacity-70" />
                          ) : (
                            <ChatDots weight="regular" className="w-[14px] h-[14px] text-[var(--text-muted)] shrink-0 opacity-40" />
                          )}
                          <span className={`text-[12px] truncate ${isAnswered ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                            {q.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}
