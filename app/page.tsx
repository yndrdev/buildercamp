import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, slug, name, logo_url')
    .order('created_at', { ascending: true })

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#9CA3AF]">No organizations found.</p>
      </div>
    )
  }

  if (clients.length === 1) {
    redirect(`/${clients[0].slug}`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-12 animate-fade-in">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8703A] to-[#D4A574] flex items-center justify-center text-xs font-bold text-white">
          BC
        </div>
        <span className="text-[#9CA3AF] text-sm tracking-wider uppercase">BuilderCamp</span>
      </div>

      <h1 className="text-3xl font-bold text-[#F5F5F0] mb-3 animate-fade-in stagger-1">
        Select Your Organization
      </h1>
      <p className="text-[#9CA3AF] mb-10 animate-fade-in stagger-2">
        Choose your organization to begin the pre-session intake.
      </p>

      <div className="space-y-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/${client.slug}`}
            className="block border border-[#2A3544] rounded-lg bg-[#212D3B] p-5 hover:border-[#E8703A] hover:-translate-y-px transition-all duration-200 group animate-fade-in stagger-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {client.logo_url ? (
                  <img src={client.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1A2332] flex items-center justify-center text-[#E8703A] font-bold text-sm">
                    {client.name.charAt(0)}
                  </div>
                )}
                <span className="text-[#F5F5F0] font-medium">{client.name}</span>
              </div>
              <span className="text-[#6B7280] group-hover:text-[#E8703A] transition-colors">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
