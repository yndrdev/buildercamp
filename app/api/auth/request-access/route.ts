import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

  // Auto-add or update user in client_users so they show in admin
  await supabase
    .from('client_users')
    .upsert({
      client_id: matchedClient.id,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      status: 'active',
      last_active_at: new Date().toISOString(),
    }, { onConflict: 'client_id,email' })

  // Create response with session cookie
  const response = NextResponse.json({
    success: true,
    clientSlug: matchedClient.slug,
    clientName: matchedClient.name,
  })

  // Set a session cookie with the email and client slug
  const sessionData = JSON.stringify({ email: normalizedEmail, clientSlug: matchedClient.slug, clientId: matchedClient.id })
  response.cookies.set('bc_session', Buffer.from(sessionData).toString('base64'), {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
