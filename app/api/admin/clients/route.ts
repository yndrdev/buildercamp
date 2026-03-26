import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: list all clients with conversation counts
export async function GET() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true })

  if (!clients) return NextResponse.json({ clients: [] })

  // Get conversation counts per client
  const enriched = await Promise.all(
    clients.map(async (client) => {
      const [{ count: convoCount }, { count: subCount }] = await Promise.all([
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('client_id', client.id),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('client_id', client.id),
      ])
      return { ...client, conversationCount: convoCount || 0, submissionCount: subCount || 0 }
    })
  )

  return NextResponse.json({ clients: enriched })
}

// POST: create a new client with slug, session groups, roles, and knowledge
export async function POST(req: NextRequest) {
  const { name, slug, sessionGroups, roles, allowedDomains } = await req.json()

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  // Create client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      allowed_domains: allowedDomains ? allowedDomains.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean) : [],
    })
    .select()
    .single()

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 400 })
  }

  // Create session groups if provided
  if (sessionGroups && sessionGroups.length > 0) {
    await supabase.from('session_groups').insert(
      sessionGroups.map((sg: { name: string; description?: string }, i: number) => ({
        client_id: client.id,
        name: sg.name,
        description: sg.description || null,
        sort_order: i + 1,
      }))
    )
  }

  // Create roles if provided
  if (roles && roles.length > 0) {
    await supabase.from('client_roles').insert(
      roles.map((title: string, i: number) => ({
        client_id: client.id,
        title,
        sort_order: i + 1,
      }))
    )
  }

  // Create default knowledge entries
  await supabase.from('client_knowledge').insert([
    {
      client_id: client.id,
      category: 'client_context',
      key: 'company_overview',
      content: `${name} is a BuilderCamp workshop client. The AI Enablement workshop focuses on practical AI integration across their organization.`,
    },
    {
      client_id: client.id,
      category: 'role_context',
      key: 'default',
      content: 'Your role brings a unique perspective to AI adoption. We will tailor the workshop to show how AI tools can augment your specific workflows and help you focus on higher-value work.',
    },
  ])

  return NextResponse.json({ client })
}
