'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperPlaneTilt, Microphone, Stop, CircleNotch, Paperclip, X, File as FileIcon } from '@phosphor-icons/react'
import type { ChatAttachment } from '@/lib/types'

interface Props {
  onSend: (text: string, attachments?: ChatAttachment[]) => void
  disabled: boolean
  conversationId: string | null
}

export default function ChatInput({ onSend, disabled, conversationId }: Props) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && pendingFiles.length === 0) || disabled) return
    const text = input.trim() || (pendingFiles.length > 0 ? `[Shared ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}]` : '')
    onSend(text, pendingFiles.length > 0 ? pendingFiles : undefined)
    setInput('')
    setPendingFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !conversationId) return
    setIsUploading(true)

    const uploaded: ChatAttachment[] = []
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('conversationId', conversationId)
        const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          uploaded.push(data)
        } else {
          const err = await res.json()
          alert(err.error || 'Upload failed')
        }
      } catch {
        alert('Upload failed. Please try again.')
      }
    }

    if (uploaded.length > 0) {
      setPendingFiles((prev) => [...prev, ...uploaded])
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [conversationId])

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          if (res.ok) {
            const { text } = await res.json()
            if (text) onSend(text)
          }
        } catch { /* fallback to typing */ }
        finally { setIsTranscribing(false) }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch { /* mic not available */ }
  }, [onSend])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }, [isRecording])

  const supportsVoice = typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
  const isImage = (type: string) => type.startsWith('image/')

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Pending file previews */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {pendingFiles.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]"
              >
                {isImage(file.type) ? (
                  <img src={file.url} alt={file.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <FileIcon weight="fill" className="w-5 h-5 text-[var(--coral)] shrink-0" />
                )}
                <span className="text-[11px] text-[var(--text-secondary)] max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removePendingFile(i)}
                  className="w-4 h-4 rounded-full bg-[var(--text-muted)]/20 flex items-center justify-center hover:bg-[var(--coral)]/20 transition-colors"
                >
                  <X weight="bold" className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.csv,.txt,.xlsx,.docx,.pptx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Main input container */}
        <div className="flex-1 relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden transition-all duration-200 focus-within:border-[var(--coral)]/40 focus-within:shadow-[0_0_0_3px_rgba(242,101,72,0.08)]">
          <div className="flex items-end">
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isRecording || isTranscribing || isUploading || !conversationId}
              className="shrink-0 p-3 pl-4 text-[var(--text-muted)] hover:text-[var(--coral)] disabled:opacity-30 transition-colors"
            >
              {isUploading ? (
                <CircleNotch weight="bold" className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <Paperclip weight="bold" className="w-[18px] h-[18px]" />
              )}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={disabled || isRecording || isTranscribing}
              placeholder={isRecording ? 'Listening...' : isTranscribing ? 'Transcribing...' : 'Type your response...'}
              rows={1}
              className="w-full bg-transparent px-2 py-3.5 text-[16px] md:text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* Voice button */}
        {supportsVoice && (
          <AnimatePresence mode="wait">
            <motion.button
              key={isRecording ? 'recording' : 'idle'}
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isTranscribing}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`shrink-0 w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center transition-all duration-200 ${
                isRecording
                  ? 'bg-[var(--coral)] text-white animate-pulse-coral'
                  : isTranscribing
                    ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--coral)] hover:border-[var(--coral)]/30'
              }`}
            >
              {isTranscribing ? (
                <CircleNotch weight="bold" className="w-[18px] h-[18px] animate-spin" />
              ) : isRecording ? (
                <Stop weight="fill" className="w-[16px] h-[16px]" />
              ) : (
                <Microphone weight="bold" className="w-[18px] h-[18px]" />
              )}
            </motion.button>
          </AnimatePresence>
        )}

        {/* Send button */}
        <motion.button
          type="submit"
          disabled={disabled || (!input.trim() && pendingFiles.length === 0) || isRecording || isTranscribing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="shrink-0 w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--coral)] text-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[var(--coral-light)] transition-colors duration-200 shadow-[var(--shadow-coral)]"
        >
          <PaperPlaneTilt weight="fill" className="w-[18px] h-[18px]" />
        </motion.button>
      </form>

      <p className="text-center text-[11px] text-[var(--text-muted)] mt-3 tracking-wide">
        Powered by YNDR &times; Claude
      </p>
    </div>
  )
}
