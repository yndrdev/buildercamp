'use client'

import { motion } from 'framer-motion'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  message: ChatMessage
  index: number
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: index * 0.02 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <img src="/avatar.svg" alt="" className="w-8 h-8 rounded-full mr-3 mt-1 shrink-0" />
      )}
      <div className={cn(
        'max-w-[75%] text-[14px] leading-[1.65]',
        isUser
          ? 'bg-[var(--coral)] text-white rounded-[var(--radius-xl)] rounded-br-[var(--radius-sm)] px-5 py-3 shadow-[var(--shadow-coral)]'
          : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-[var(--radius-xl)] rounded-bl-[var(--radius-sm)] px-5 py-3.5 border border-[var(--border)]'
      )}>
        {message.content || (
          <span className="inline-flex gap-1.5 items-center h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </motion.div>
  )
}
