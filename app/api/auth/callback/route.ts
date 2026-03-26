import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const origin = req.headers.get('origin') || new URL(req.url).origin

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`)
  }

  const supabaseAuth = createSupabaseServer()

  const { data: { user }, error } = await supabaseAuth.auth.exchangeCodeForSession(code)

  if (error || !user?.email) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // Find client by email domain
  const domain = user.email.split('@')[1].toLowerCase()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug, allowed_domains')

  const matchedClient = clients?.find((c) =>
    (c.allowed_domains || []).some((d: string) => d.toLowerCase() === domain)
  )

  if (!matchedClient) {
    await supabaseAuth.auth.signOut()
    return NextResponse.redirect(`${origin}/?error=domain_not_authorized`)
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
        email: user.email,
        display_name: user.email.split('@')[0],
      })
  }

  return NextResponse.redirect(`${origin}/${matchedClient.slug}`)
}
