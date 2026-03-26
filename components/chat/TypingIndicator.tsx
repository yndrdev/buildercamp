'use client'

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#212D3B] border border-[#2A3544] rounded-2xl rounded-bl-md px-4 py-3">
        <span className="inline-flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}
