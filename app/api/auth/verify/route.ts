import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
  }

  const supabaseAuth = createSupabaseServer()

  // Verify the OTP code
  const { data: { user }, error } = await supabaseAuth.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired code. Please try again.' }, { status: 401 })
  }

  // Find client by email domain
  const domain = email.split('@')[1].toLowerCase()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug, allowed_domains')

  const matchedClient = clients?.find((c) =>
    (c.allowed_domains || []).some((d: string) => d.toLowerCase() === domain)
  )

  if (!matchedClient) {
    await supabaseAuth.auth.signOut()
    return NextResponse.json({ error: 'Domain not authorized' }, { status: 403 })
  }

  // Upsert user profile
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (existingProfile) {
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('auth_user_id', user.id)
  } else {
    await supabase
      .from('user_profiles')
      .insert({
        auth_user_id: user.id,
        client_id: matchedClient.id,
        email,
        display_name: email.split('@')[0],
      })
  }

  return NextResponse.json({ success: true, clientSlug: matchedClient.slug })
}
