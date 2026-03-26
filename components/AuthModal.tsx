'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, EnvelopeSimple, CheckCircle, ArrowRight, CircleNotch, Warning } from '@phosphor-icons/react'

interface Props {
  isOpen: boolean
  onClose: () => void
  mode: 'request' | 'login'
}

type Step = 'email' | 'sending' | 'success' | 'error'

export default function AuthModal({ isOpen, onClose, mode }: Props) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldown, setCooldown] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return

    setStep('sending')
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (res.ok) {
        setStep('success')
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Something went wrong.')
        setStep('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStep('error')
    }
  }

  const handleResend = async () => {
    setCooldown(true)
    setStep('sending')
    await handleSubmit(new Event('submit') as unknown as React.FormEvent)
    setTimeout(() => setCooldown(false), 60000)
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setStep('email')
      setEmail('')
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-lg)]"
          >
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10">
              <X weight="bold" className="w-4 h-4" />
            </button>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* Email Input Step */}
                {step === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--coral)]/8 border border-[var(--coral)]/15 flex items-center justify-center mb-5">
                      <EnvelopeSimple weight="bold" className="w-5 h-5 text-[var(--coral)]" />
                    </div>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight mb-1">
                      {mode === 'request' ? 'Request Access' : 'Welcome Back'}
                    </h2>
                    <p className="text-[13px] text-[var(--text-muted)] mb-6 leading-relaxed">
                      {mode === 'request'
                        ? 'Enter your work email and we will send you an access link.'
                        : 'Enter your email to receive a login link.'}
                    </p>
                    <form onSubmit={handleSubmit}>
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
                        Send Access Link <ArrowRight weight="bold" className="w-4 h-4" />
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Sending Step */}
                {step === 'sending' && (
                  <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                    <CircleNotch weight="bold" className="w-8 h-8 text-[var(--coral)] animate-spin mx-auto mb-4" />
                    <p className="text-[14px] text-[var(--text-secondary)]">Sending access link...</p>
                  </motion.div>
                )}

                {/* Success Step */}
                {step === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                      className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5"
                    >
                      <CheckCircle weight="fill" className="w-7 h-7 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Check Your Inbox</h2>
                    <p className="text-[13px] text-[var(--text-muted)] mb-1">We sent an access link to</p>
                    <p className="text-[14px] text-[var(--coral)] font-medium mb-6">{email}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mb-4">Click the link in the email to access BuilderCamp. The link expires in 1 hour.</p>
                    <button
                      onClick={handleResend}
                      disabled={cooldown}
                      className="text-[12px] text-[var(--gold)] hover:text-[var(--gold-light)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {cooldown ? 'Link sent. Check your email.' : 'Didn\'t receive it? Resend'}
                    </button>
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
