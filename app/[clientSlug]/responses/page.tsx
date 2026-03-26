import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'

interface Props {
  params: { clientSlug: string }
}

export const revalidate = 0

export default async function ResponsesPage({ params }: Props) {
  const { clientSlug } = params

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', clientSlug)
    .single()

  if (!client) notFound()

  const [{ data: sessionGroups }, { data: questions }, { data: submissions }, { data: conversations }] = await Promise.all([
    supabase.from('session_groups').select('id, name').eq('client_id', client.id).order('sort_order'),
    supabase.from('questions').select('id, session_group_id, label').in('session_group_id',
      (await supabase.from('session_groups').select('id').eq('client_id', client.id)).data?.map((sg) => sg.id) || []
    ).order('sort_order'),
    supabase.from('submissions').select('*').eq('client_id', client.id).order('submitted_at', { ascending: false }),
    supabase.from('conversations').select('*').eq('client_id', client.id).order('started_at', { ascending: false }),
  ])

  return (
    <AdminDashboard
      clientSlug={clientSlug}
      clientName={client.name}
      sessionGroups={sessionGroups || []}
      questions={questions || []}
      submissions={submissions || []}
      conversations={conversations || []}
    />
  )
}
