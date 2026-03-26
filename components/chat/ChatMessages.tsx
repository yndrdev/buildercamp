'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/lib/types'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
}

export default function ChatMessages({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-6 md:px-10 py-8">
      <div className="max-w-[680px] mx-auto space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} index={i} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
