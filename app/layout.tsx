import type { Metadata } from 'next'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen">
        <div className="h-[3px] w-full bg-[#E8703A]" />
        <main className="max-w-[720px] mx-auto px-6 pt-[60px] pb-16">
          {children}
        </main>
        <footer className="text-center py-8 text-[#6B7280] text-sm border-t border-[#2A3544]">
          BuilderCamp &middot; Powered by YNDR &times; Claude
        </footer>
      </body>
    </html>
  )
}
