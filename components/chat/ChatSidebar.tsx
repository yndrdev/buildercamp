'use client'

import { CheckCircle2, Circle, MessageSquare, User, Briefcase, Layers } from 'lucide-react'
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
  const progress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0

  return (
    <Sidebar className="border-r border-[#2A3544]">
      <SidebarHeader className="p-4 border-b border-[#2A3544]">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-[#E8703A]" />
          <span className="text-xs font-bold tracking-widest uppercase text-[#E8703A]">Intake Progress</span>
        </div>
        {totalQuestions > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>{totalAnswered} of {totalQuestions}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-[#1A2332] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E8703A] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Meta items: Name, Role, Session */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#6B7280] text-xs">Basics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3">
                  {respondentName ? (
                    <CheckCircle2 className="w-4 h-4 text-[#E8703A] shrink-0" />
                  ) : (
                    <User className={`w-4 h-4 shrink-0 ${phase === 'name' ? 'text-[#E8703A] animate-pulse' : 'text-[#6B7280]'}`} />
                  )}
                  <span className={respondentName ? 'text-[#E8E6E1]' : 'text-[#6B7280]'}>
                    {respondentName || 'Your Name'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3">
                  {respondentRole ? (
                    <CheckCircle2 className="w-4 h-4 text-[#E8703A] shrink-0" />
                  ) : (
                    <Briefcase className={`w-4 h-4 shrink-0 ${phase === 'role' ? 'text-[#E8703A] animate-pulse' : 'text-[#6B7280]'}`} />
                  )}
                  <span className={respondentRole ? 'text-[#E8E6E1]' : 'text-[#6B7280]'}>
                    {respondentRole || 'Your Role'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3">
                  {sessionName ? (
                    <CheckCircle2 className="w-4 h-4 text-[#E8703A] shrink-0" />
                  ) : (
                    <Layers className={`w-4 h-4 shrink-0 ${phase === 'session' ? 'text-[#E8703A] animate-pulse' : 'text-[#6B7280]'}`} />
                  )}
                  <span className={sessionName ? 'text-[#E8E6E1]' : 'text-[#6B7280]'}>
                    {sessionName || 'Session Track'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Question sections */}
        {sections.map((section, si) => (
          <SidebarGroup key={si}>
            {section.header && (
              <SidebarGroupLabel className="text-[#E8703A] text-xs font-bold tracking-wider uppercase">
                {section.header}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.questions.map((q) => {
                  const isAnswered = answeredSet.has(q.id)
                  return (
                    <SidebarMenuItem key={q.id}>
                      <SidebarMenuButton className="gap-3">
                        {isAnswered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#E8703A] shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[#2A3544] shrink-0" />
                        )}
                        <span className={`text-xs truncate ${isAnswered ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {q.label}
                          {q.isRequired && <span className="text-[#E8703A] ml-0.5">*</span>}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
