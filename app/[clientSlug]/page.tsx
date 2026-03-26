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

  const { data: sessionGroups } = await supabase
    .from('session_groups')
    .select('*')
    .eq('client_id', client.id)
    .order('sort_order', { ascending: true })

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('session_group_id', (sessionGroups || []).map((sg) => sg.id))
    .order('sort_order', { ascending: true })

  return (
    <IntakeForm
      client={client}
      sessionGroups={sessionGroups || []}
      questions={questions || []}
    />
  )
}
