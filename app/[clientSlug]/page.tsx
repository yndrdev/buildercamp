import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import IntakeForm from '@/components/IntakeForm'

interface Props {
  params: { clientSlug: string }
}

export default async function ClientIntakePage({ params }: Props) {
  const { clientSlug } = params

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', clientSlug)
    .single()

  if (!client) notFound()

  const [{ data: sessionGroups }, { data: roles }] = await Promise.all([
    supabase
      .from('session_groups')
      .select('*')
      .eq('client_id', client.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('client_roles')
      .select('title')
      .eq('client_id', client.id)
      .order('sort_order', { ascending: true }),
  ])

  const sgIds = (sessionGroups || []).map((sg) => sg.id)
  const { data: questions } = sgIds.length > 0
    ? await supabase
        .from('questions')
        .select('*')
        .in('session_group_id', sgIds)
        .order('sort_order', { ascending: true })
    : { data: [] }

  return (
    <IntakeForm
      client={client}
      sessionGroups={sessionGroups || []}
      questions={questions || []}
      roles={(roles || []).map((r) => r.title)}
    />
  )
}
