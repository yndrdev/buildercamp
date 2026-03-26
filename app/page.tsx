import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LandingPage from '@/components/LandingPage'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Check if user is already authenticated
  const supabaseAuth = createSupabaseServer()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (user?.email) {
    // Find their client by email domain
    const domain = user.email.split('@')[1].toLowerCase()
    const { data: clients } = await supabase
      .from('clients')
      .select('slug, allowed_domains')

    const match = clients?.find((c) =>
      (c.allowed_domains || []).some((d: string) => d.toLowerCase() === domain)
    )

    if (match) {
      redirect(`/${match.slug}`)
    }
  }

  return <LandingPage />
}
