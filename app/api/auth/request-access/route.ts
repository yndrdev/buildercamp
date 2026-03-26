import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const domain = email.split('@')[1].toLowerCase()

  // Check if domain matches any client
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug, name, allowed_domains')

  const matchedClient = clients?.find((c) =>
    (c.allowed_domains || []).some((d: string) => d.toLowerCase() === domain)
  )

  if (!matchedClient) {
    return NextResponse.json(
      { error: 'Your organization has not been registered with BuilderCamp yet. Please contact your administrator.' },
      { status: 403 }
    )
  }

  // Send magic link via Supabase Auth using anon key (signInWithOtp works with anon)
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const origin = req.headers.get('origin') || 'https://www.buildercamp.ai'

  const { error } = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send access link. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
