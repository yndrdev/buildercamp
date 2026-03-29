import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const domain = normalizedEmail.split('@')[1]

  // 1. Check if user was individually pre-added in client_users
  const { data: clientUsers } = await supabase
    .from('client_users')
    .select('id, client_id, clients(id, slug, name)')
    .eq('email', normalizedEmail)
    .limit(1)

  const clientUser = clientUsers?.[0] || null

  // 2. Or check if their domain matches any client
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug, name, allowed_domains')

  const domainClient = clients?.find((c) =>
    (c.allowed_domains || []).some((d: string) => d.toLowerCase() === domain)
  )

  // Determine matched client (individual user takes priority)
  const clientsData = Array.isArray(clientUser?.clients)
    ? clientUser.clients[0]
    : clientUser?.clients
  const matchedClient = clientsData
    ? (clientsData as unknown as { id: string; slug: string; name: string })
    : domainClient
      ? { id: domainClient.id, slug: domainClient.slug, name: domainClient.name }
      : null

  if (!matchedClient) {
    return NextResponse.json(
      { error: 'Your organization has not been registered with BuilderCamp yet. Please contact your administrator.' },
      { status: 403 }
    )
  }

  // Auto-verify: create auth user + session without OTP
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const supabaseAuth = createSupabaseServer()

  // Debug: verify service role key is present
  console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)
  console.log('SERVICE_ROLE_KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10))

  // Generate magic link (creates auth user if needed)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('generateLink error message:', linkError?.message)
    console.error('generateLink error status:', linkError?.status)
    console.error('generateLink error name:', linkError?.name)
    console.error('generateLink full:', JSON.stringify(linkError, null, 2))
    return NextResponse.json({ error: 'Failed to authenticate. Please try again.' }, { status: 500 })
  }

  // Verify the token immediately to create a session (sets auth cookies)
  const { data: verifyData, error: verifyError } = await supabaseAuth.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('verifyOtp error:', verifyError)
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 })
  }

  const authUser = verifyData?.user || linkData.user

  // Update client_users status if they were individually added
  if (clientUser) {
    await supabase
      .from('client_users')
      .update({ status: 'active', last_active_at: new Date().toISOString() })
      .eq('id', clientUser.id)
  }

  // Upsert user profile
  if (authUser) {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (existingProfile) {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('auth_user_id', authUser.id)
    } else {
      await supabase
        .from('user_profiles')
        .insert({
          auth_user_id: authUser.id,
          client_id: matchedClient.id,
          email: normalizedEmail,
          display_name: normalizedEmail.split('@')[0],
        })
    }
  }

  return NextResponse.json({
    success: true,
    autoVerified: true,
    clientSlug: matchedClient.slug,
  })
}
