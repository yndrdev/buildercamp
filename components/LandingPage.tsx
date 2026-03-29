'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import AuthModal from './AuthModal'

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--coral)] opacity-[0.04] blur-[120px]" />
        <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[var(--gold)] opacity-[0.03] blur-[100px]" />
      </div>

      {/* Floating particles */}
      {[
        { x: '20%', y: '25%', size: 4, delay: 0, dur: 6 },
        { x: '75%', y: '30%', size: 3, delay: 1.5, dur: 7 },
        { x: '60%', y: '70%', size: 5, delay: 0.8, dur: 5.5 },
        { x: '30%', y: '65%', size: 3, delay: 2, dur: 8 },
        { x: '85%', y: '55%', size: 4, delay: 0.5, dur: 6.5 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x, top: p.y, width: p.size, height: p.size,
            background: i % 2 === 0 ? 'var(--coral)' : 'var(--gold)',
            opacity: 0.25,
          }}
          animate={{ y: [-8, 8, -8], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-[560px]">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <motion.img
            src="/avatar.svg"
            alt=""
            className="w-20 h-20 rounded-[var(--radius-xl)] mx-auto shadow-[var(--shadow-lg)]"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-5xl font-bold tracking-tighter leading-[1.05] mb-4"
        >
          <span className="text-[var(--text-primary)]">Welcome to </span>
          <span className="text-gradient">BuilderCamp</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-[14px] text-[var(--text-muted)] tracking-wider uppercase mb-2"
        >
          Powered by YNDR
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-[16px] text-[var(--text-secondary)] leading-relaxed mb-10 max-w-[400px] mx-auto"
        >
          AI Enablement, tailored to your team. Prepare for your workshop in a guided conversation.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <motion.button
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-[var(--radius-full)] bg-[var(--coral)] text-white font-semibold text-[15px] shadow-[var(--shadow-coral)] hover:bg-[var(--coral-light)] transition-colors"
          >
            Join BuilderCamp <ArrowRight weight="bold" className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 text-[11px] text-[var(--text-muted)] tracking-wide"
      >
        BuilderCamp by YNDR
      </motion.div>

      {/* Auth Modal */}
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
