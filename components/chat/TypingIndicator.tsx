'use client'

import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--coral)] flex items-center justify-center text-[9px] font-bold text-white mr-3 mt-1 shrink-0">
        BC
      </div>
      <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] rounded-bl-[var(--radius-sm)] px-5 py-4">
        <span className="inline-flex gap-2 items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--coral)]"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  )
}
