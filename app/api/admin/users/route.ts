import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: list users for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const { data: users } = await supabase
    .from('client_users')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })

  return NextResponse.json({ users: users || [] })
}

// POST: add single user or bulk upload
export async function POST(req: NextRequest) {
  const { clientId, users } = await req.json()

  if (!clientId || !users || !Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: 'clientId and users array required' }, { status: 400 })
  }

  const toInsert = users
    .filter((u: { email?: string }) => u.email && u.email.includes('@'))
    .map((u: { email: string; name?: string; role?: string; department?: string }) => ({
      client_id: clientId,
      email: u.email.trim().toLowerCase(),
      name: u.name?.trim() || null,
      role: u.role?.trim() || null,
      department: u.department?.trim() || null,
      status: 'invited',
    }))

  if (toInsert.length === 0) {
    return NextResponse.json({ error: 'No valid users to add' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('client_users')
    .upsert(toInsert, { onConflict: 'client_id,email' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ added: data?.length || 0 })
}

// DELETE: remove a user
export async function DELETE(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  await supabase.from('client_users').delete().eq('id', userId)
  return NextResponse.json({ success: true })
}
