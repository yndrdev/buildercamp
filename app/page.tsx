import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const cookieStore = cookies()
  const session = cookieStore.get('bc_session')

  if (session?.value) {
    try {
      const data = JSON.parse(Buffer.from(session.value, 'base64').toString())
      if (data.clientSlug) redirect(`/${data.clientSlug}`)
    } catch { /* invalid cookie, show landing */ }
  }

  return <LandingPage />
}
