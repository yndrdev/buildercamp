import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Standard session tracks for every new client
const DEFAULT_TRACKS = [
  { name: 'Leadership', description: 'Strategy, planning, and executive decision-making' },
  { name: 'Business Operations', description: 'Client engagement, reporting, and day-to-day workflows' },
  { name: 'Technology', description: 'Roadmap, product strategy, and hands-on building' },
]

// Standard questions per track (5 each)
const DEFAULT_QUESTIONS: Record<string, { label: string; section: string; required: boolean }[]> = {
  'Leadership': [
    { label: 'What does a typical day look like for you?', section: 'About You', required: true },
    { label: 'What is the single biggest time sink in your week?', section: 'Pain Points', required: true },
    { label: 'What strategic documents or reports do you produce regularly?', section: 'Workflows', required: false },
    { label: 'Have you used Claude or any AI tool before? If so, for what?', section: 'AI Readiness', required: false },
    { label: 'What is one thing you hope to walk out of this session able to do?', section: 'Goals', required: true },
  ],
  'Business Operations': [
    { label: 'What does a typical week look like for you?', section: 'About You', required: true },
    { label: 'What is the most tedious or repetitive task you do?', section: 'Pain Points', required: true },
    { label: 'What types of client or internal communications take the longest?', section: 'Workflows', required: false },
    { label: 'Have you used Claude or any AI tool before? If so, for what?', section: 'AI Readiness', required: false },
    { label: 'What is one thing you hope to walk out of this session able to do?', section: 'Goals', required: true },
  ],
  'Technology': [
    { label: 'What is your primary focus area?', section: 'About You', required: true },
    { label: 'Where does your team lose the most time?', section: 'Pain Points', required: true },
    { label: 'What are your top 3 priorities this quarter?', section: 'Roadmap', required: true },
    { label: 'Have you or your team used Claude, Copilot, or any AI dev tools?', section: 'AI Readiness', required: false },
    { label: 'What is one thing you hope to walk out of this session able to do?', section: 'Goals', required: true },
  ],
}

// Standard roles
const DEFAULT_ROLES = [
  'CEO', 'CTO', 'COO', 'VP of Engineering', 'VP of Sales', 'VP of Operations',
  'Director', 'Product Manager', 'Software Engineer', 'Business Analyst',
  'Account Manager', 'Operations Manager', 'Other',
]

// GET: list all clients with conversation counts
export async function GET() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true })

  if (!clients) return NextResponse.json({ clients: [] })

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

// POST: create a new client with defaults
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

  // Use provided tracks or defaults
  const tracks = (sessionGroups && sessionGroups.length > 0)
    ? sessionGroups.map((sg: { name: string; description?: string }) => ({ name: sg.name, description: sg.description || null }))
    : DEFAULT_TRACKS

  const { data: createdGroups } = await supabase
    .from('session_groups')
    .insert(tracks.map((sg: { name: string; description?: string | null }, i: number) => ({
      client_id: client.id,
      name: sg.name,
      description: sg.description || null,
      sort_order: i + 1,
    })))
    .select('id, name')

  // Create questions for each track (use defaults if no custom tracks provided)
  if (createdGroups) {
    const questionsToInsert: { session_group_id: string; label: string; section_header: string; is_required: boolean; field_type: string; sort_order: number }[] = []

    for (const group of createdGroups) {
      const qs = DEFAULT_QUESTIONS[group.name]
      if (qs) {
        qs.forEach((q, i) => {
          questionsToInsert.push({
            session_group_id: group.id,
            label: q.label,
            section_header: q.section,
            is_required: q.required,
            field_type: 'textarea',
            sort_order: i + 1,
          })
        })
      }
    }

    if (questionsToInsert.length > 0) {
      await supabase.from('questions').insert(questionsToInsert)
    }
  }

  // Use provided roles or defaults
  const roleList = (roles && roles.length > 0)
    ? roles.map((r: string) => r.trim()).filter(Boolean)
    : DEFAULT_ROLES

  await supabase.from('client_roles').insert(
    roleList.map((title: string, i: number) => ({
      client_id: client.id,
      title,
      sort_order: i + 1,
    }))
  )

  // Create knowledge entries
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
