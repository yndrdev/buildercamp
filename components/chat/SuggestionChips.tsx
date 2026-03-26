'use client'

import { motion } from 'framer-motion'

interface Props {
  options: string[]
  onSelect: (option: string) => void
}

export default function SuggestionChips({ options, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="max-w-[680px] mx-auto flex flex-wrap gap-2"
    >
      {options.map((option, i) => (
        <motion.button
          key={option}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium border border-[var(--coral)]/30 text-[var(--coral)] bg-[var(--coral)]/5 hover:bg-[var(--coral)]/12 hover:border-[var(--coral)]/50 hover:shadow-[var(--shadow-coral)] transition-colors duration-200"
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  )
}
