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
    { label: 'If AI works perfectly for your organization in the next 12 months, what specific outcome would make you say the investment was worth it?', section: 'Strategic Bet', required: true },
    { label: 'What is a competitor or peer organization doing with AI right now that, if you are being honest, concerns you?', section: 'Competitive Pressure', required: true },
    { label: 'When a new technology initiative stalls at your organization, what is usually the reason?', section: 'Decision Bottleneck', required: true },
    { label: 'How are people in your organization already using AI, officially or unofficially, and what do you think about that?', section: 'Current Exposure', required: true },
    { label: 'What is one thing about how your team works today that AI should not change?', section: 'Non-Negotiable', required: false },
  ],
  'Business Operations': [
    { label: 'What task do you spend the most time on that you suspect a machine could do faster, even if imperfectly?', section: 'Time Drain', required: true },
    { label: 'What is something you have built a personal system for, a spreadsheet, a checklist, a shortcut, because the official tool does not handle it well?', section: 'Workaround Signal', required: true },
    { label: 'What decision do you make regularly that requires experience or gut instinct, not just data?', section: 'Judgment Call', required: true },
    { label: 'When you need to make a decision quickly, what information do you wish you had at your fingertips but currently have to go dig for?', section: 'Information Gap', required: true },
    { label: 'If an AI tool gave you a recommendation for your work, what would it need to show you before you would trust it enough to act on it?', section: 'Trust Threshold', required: false },
  ],
  'Technology': [
    { label: 'What is the most manual or repetitive part of your development or product workflow right now?', section: 'Build Reality', required: true },
    { label: 'What are the biggest constraints you would face if asked to integrate an AI service into your current stack tomorrow?', section: 'Integration Constraint', required: true },
    { label: 'Which AI tools or models have you already tried for your work, and what was your honest assessment?', section: 'AI in Practice', required: true },
    { label: 'If you had to point an AI model at your organization\'s data today, what would be the first problem you would run into?', section: 'Data Readiness', required: true },
    { label: 'For AI capabilities, is your team\'s instinct to build custom solutions, buy off-the-shelf tools, or wire together APIs, and what has shaped that instinct?', section: 'Build vs. Buy', required: false },
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
