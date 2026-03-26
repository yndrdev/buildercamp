import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer()
  await supabase.auth.signOut()

  const origin = req.headers.get('origin') || new URL(req.url).origin
  return NextResponse.redirect(`${origin}/`, { status: 302 })
}
