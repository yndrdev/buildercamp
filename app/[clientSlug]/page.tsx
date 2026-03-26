import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ChatLayout from '@/components/chat/ChatLayout'

interface Props {
  params: { clientSlug: string }
}

export default async function ClientIntakePage({ params }: Props) {
  const { clientSlug } = params

  const { data: client } = await supabase
    .from('clients')
    .select('id, slug, name')
    .eq('slug', clientSlug)
    .single()

  if (!client) notFound()

  return <ChatLayout clientId={client.id} clientName={client.name} />
}
