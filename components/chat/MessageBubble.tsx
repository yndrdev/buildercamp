'use client'

import { motion } from 'framer-motion'
import { File as FileIcon, DownloadSimple } from '@phosphor-icons/react'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  message: ChatMessage
  index: number
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user'
  const attachments = message.attachments || []
  const images = attachments.filter((a) => a.type.startsWith('image/'))
  const files = attachments.filter((a) => !a.type.startsWith('image/'))

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
        {/* Image attachments */}
        {images.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', message.content ? 'mb-2' : '')}>
            {images.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={img.url}
                  alt={img.name}
                  className="max-w-[240px] max-h-[180px] rounded-[var(--radius-md)] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        )}

        {/* File attachments */}
        {files.length > 0 && (
          <div className={cn('space-y-1.5', message.content ? 'mb-2' : '')}>
            {files.map((file, i) => (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] transition-colors',
                  isUser
                    ? 'bg-white/15 hover:bg-white/25'
                    : 'bg-[var(--bg)] hover:bg-[var(--surface)] border border-[var(--border)]'
                )}
              >
                <FileIcon weight="fill" className="w-4 h-4 shrink-0 opacity-70" />
                <span className="text-[12px] truncate flex-1">{file.name}</span>
                <span className={cn('text-[10px] shrink-0', isUser ? 'text-white/60' : 'text-[var(--text-muted)]')}>
                  {formatFileSize(file.size)}
                </span>
                <DownloadSimple weight="bold" className="w-3.5 h-3.5 shrink-0 opacity-50" />
              </a>
            ))}
          </div>
        )}

        {/* Text content */}
        {message.content ? (
          message.content
        ) : attachments.length === 0 ? (
          <span className="inline-flex gap-1.5 items-center h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        ) : null}
      </div>
    </motion.div>
  )
}
