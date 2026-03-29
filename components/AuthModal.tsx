'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, EnvelopeSimple, CheckCircle, ArrowRight, CircleNotch, Warning, ShieldCheck } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'email' | 'sending' | 'code' | 'verifying' | 'success' | 'error'

export default function AuthModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState<Step>('email')
  const [errorMsg, setErrorMsg] = useState('')
  const [clientSlug, setClientSlug] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return

    setStep('sending')
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setClientSlug(data.clientSlug || '')
        if (data.autoVerified) {
          // Domain or pre-added user — already authenticated, skip code entry
          setStep('success')
          setTimeout(() => {
            router.push(`/${data.clientSlug || clientSlug}`)
          }, 1200)
        } else {
          setStep('code')
          setTimeout(() => codeRefs.current[0]?.focus(), 100)
        }
      } else {
        setErrorMsg(data.error || 'Something went wrong.')
        setStep('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStep('error')
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        verifyCode(fullCode)
      }
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      verifyCode(pasted)
    }
  }

  const verifyCode = async (fullCode: string) => {
    setStep('verifying')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: fullCode }),
      })
      const data = await res.json()

      if (res.ok) {
        setStep('success')
        setTimeout(() => {
          router.push(`/${data.clientSlug || clientSlug}`)
        }, 1200)
      } else {
        setErrorMsg(data.error || 'Invalid code.')
        setCode(['', '', '', '', '', ''])
        setStep('code')
        setTimeout(() => codeRefs.current[0]?.focus(), 100)
      }
    } catch {
      setErrorMsg('Network error.')
      setStep('code')
    }
  }

  const handleResend = async () => {
    setCooldown(true)
    setCode(['', '', '', '', '', ''])
    setStep('sending')
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setStep('code')
        setTimeout(() => codeRefs.current[0]?.focus(), 100)
      }
    } catch { /* ignore */ }
    setTimeout(() => setCooldown(false), 60000)
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setStep('email')
      setEmail('')
      setCode(['', '', '', '', '', ''])
      setErrorMsg('')
    }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-lg)]"
          >
            <button onClick={handleClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10">
              <X weight="bold" className="w-4 h-4" />
            </button>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* Email Step */}
                {step === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--coral)]/8 border border-[var(--coral)]/15 flex items-center justify-center mb-5">
                      <EnvelopeSimple weight="bold" className="w-5 h-5 text-[var(--coral)]" />
                    </div>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight mb-1">
                      Join BuilderCamp
                    </h2>
                    <p className="text-[13px] text-[var(--text-muted)] mb-6 leading-relaxed">
                      Enter your work email and we will send you a login code.
                    </p>
                    <form onSubmit={handleEmailSubmit}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoFocus
                        required
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/30 focus:border-[var(--coral)]/40 mb-4 transition-all"
                      />
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!email.includes('@')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] bg-[var(--coral)] text-white font-medium text-[14px] hover:bg-[var(--coral-light)] disabled:opacity-30 transition-colors shadow-[var(--shadow-coral)]"
                      >
                        Send Code <ArrowRight weight="bold" className="w-4 h-4" />
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Sending Step */}
                {(step === 'sending' || step === 'verifying') && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                    <CircleNotch weight="bold" className="w-8 h-8 text-[var(--coral)] animate-spin mx-auto mb-4" />
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      {step === 'sending' ? 'Sending code...' : 'Verifying...'}
                    </p>
                  </motion.div>
                )}

                {/* Code Entry Step */}
                {step === 'code' && (
                  <motion.div key="code" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--coral)]/8 border border-[var(--coral)]/15 flex items-center justify-center mb-5">
                      <ShieldCheck weight="bold" className="w-5 h-5 text-[var(--coral)]" />
                    </div>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight mb-1">Enter Your Code</h2>
                    <p className="text-[13px] text-[var(--text-muted)] mb-1">We sent a 6-digit code to</p>
                    <p className="text-[13px] text-[var(--coral)] font-medium mb-6">{email}</p>

                    {errorMsg && (
                      <p className="text-[12px] text-red-400 mb-3 text-center">{errorMsg}</p>
                    )}

                    {/* 6-digit code input */}
                    <div className="flex gap-2 justify-center mb-6" onPaste={handleCodePaste}>
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { codeRefs.current[i] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                          className="w-11 h-13 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] text-center text-[20px] font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/30 focus:border-[var(--coral)]/40 transition-all"
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleResend}
                      disabled={cooldown}
                      className="w-full text-center text-[12px] text-[var(--gold)] hover:text-[var(--gold-light)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {cooldown ? 'Code sent. Check your email.' : 'Didn\'t receive it? Resend'}
                    </button>
                  </motion.div>
                )}

                {/* Success Step */}
                {step === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                      className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5"
                    >
                      <CheckCircle weight="fill" className="w-7 h-7 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Verified</h2>
                    <p className="text-[13px] text-[var(--text-muted)]">Redirecting to your workspace...</p>
                  </motion.div>
                )}

                {/* Error Step */}
                {step === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                      <Warning weight="fill" className="w-7 h-7 text-amber-400" />
                    </div>
                    <h2 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight mb-3">Access Not Available</h2>
                    <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-6">{errorMsg}</p>
                    <button
                      onClick={() => { setStep('email'); setErrorMsg('') }}
                      className="text-[13px] text-[var(--coral)] hover:text-[var(--coral-light)] font-medium transition-colors"
                    >
                      Try a different email
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
