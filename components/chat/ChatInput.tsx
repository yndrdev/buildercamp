'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Mic, Square, Loader2 } from 'lucide-react'

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

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
            if (text) {
              onSend(text)
            }
          }
        } catch {
          // Silently fail — user can type instead
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      // Microphone not available
    }
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
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isRecording || isTranscribing}
          placeholder={isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Type your response...'}
          rows={1}
          className="w-full bg-[#1E2D3D] border border-[#2A4054] rounded-xl px-4 py-3 pr-12 text-sm text-[#D4A574] placeholder:text-[#6B7280] resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E8703A]"
        />
      </div>

      {/* Voice button */}
      {supportsVoice && (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isRecording
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
              : isTranscribing
                ? 'bg-[#1E2D3D] border border-[#2A4054] text-[#6B7280]'
                : 'bg-[#1E2D3D] border border-[#2A4054] text-[#9CA3AF] hover:text-[#E8703A] hover:border-[#E8703A]/40'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Send button */}
      <button
        type="submit"
        disabled={disabled || !input.trim() || isRecording || isTranscribing}
        className="shrink-0 w-10 h-10 rounded-xl bg-[#E8703A] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F09D6A] transition-all duration-200"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  )
}
