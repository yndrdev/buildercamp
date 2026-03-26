import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { cn } from '@/lib/utils'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'BuilderCamp — Pre-Session Intake',
  description: 'Prepare for your AI Enablement workshop with YNDR',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn('dark font-sans', geist.variable)}>
      <body className="min-h-screen bg-[#0F1419]">
        {children}
      </body>
    </html>
  )
}
