'use client'

interface Props {
  options: string[]
  onSelect: (option: string) => void
}

export default function SuggestionChips({ options, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#E8703A]/40 text-[#E8703A] bg-[#E8703A]/5 hover:bg-[#E8703A]/15 hover:border-[#E8703A]/60 transition-all duration-200"
        >
          {option}
        </button>
      ))}
    </div>
  )
}
