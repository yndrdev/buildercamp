'use client'

import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  message: ChatMessage
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-[#E8703A]/15 border border-[#E8703A]/25 text-[#F5F5F0] rounded-br-md'
          : 'bg-[#212D3B] border border-[#2A3544] text-[#E8E6E1] rounded-bl-md'
      )}>
        {message.content || (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}
