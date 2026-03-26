'use client'

interface Question {
  id: string
  label: string
  hint: string | null
  field_type: 'text' | 'textarea' | 'select'
  options: string[] | null
  is_required: boolean
}

interface QuestionFieldProps {
  question: Question
  value: string
  onChange: (value: string) => void
}

export default function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const baseClasses =
    'w-full bg-[var(--field-bg)] border border-[var(--field-border)] rounded-lg px-4 py-3 text-[var(--gold)] placeholder:text-[var(--text-muted)] transition-all duration-200 text-sm'

  return (
    <div>
      <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
        {question.label}
        {question.is_required && <span className="text-[var(--accent)] ml-1">*</span>}
      </label>
      {question.hint && (
        <p className="text-[var(--text-muted)] text-xs mb-2">{question.hint}</p>
      )}

      {question.field_type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${baseClasses} resize-y min-h-[100px]`}
          required={question.is_required}
        />
      ) : question.field_type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClasses} cursor-pointer`}
          required={question.is_required}
        >
          <option value="">Select an option...</option>
          {question.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClasses}
          required={question.is_required}
        />
      )}
    </div>
  )
}
