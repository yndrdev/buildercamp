import { cookies } from 'next/headers'
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

  // Get user email from session cookie
  let userEmail: string | null = null
  const cookieStore = cookies()
  const session = cookieStore.get('bc_session')
  if (session?.value) {
    try {
      const data = JSON.parse(Buffer.from(session.value, 'base64').toString())
      userEmail = data.email || null
    } catch { /* invalid cookie */ }
  }

  return <ChatLayout clientId={client.id} clientName={client.name} userEmail={userEmail} />
}
