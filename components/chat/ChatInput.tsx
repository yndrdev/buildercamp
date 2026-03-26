'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperPlaneTilt, Microphone, Stop, CircleNotch } from '@phosphor-icons/react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
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

  return (
    <div className="max-w-[680px] mx-auto">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
        {/* Main input container */}
        <div className="flex-1 relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden transition-all duration-200 focus-within:border-[var(--coral)]/40 focus-within:shadow-[0_0_0_3px_rgba(242,101,72,0.08)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || isRecording || isTranscribing}
            placeholder={isRecording ? 'Listening...' : isTranscribing ? 'Transcribing...' : 'Type your response...'}
            rows={1}
            className="w-full bg-transparent px-5 py-3.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none"
          />
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
          disabled={disabled || !input.trim() || isRecording || isTranscribing}
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
