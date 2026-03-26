import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ResponsesTable from '@/components/ResponsesTable'

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

  const { data: sessionGroups } = await supabase
    .from('session_groups')
    .select('id, name')
    .eq('client_id', client.id)
    .order('sort_order', { ascending: true })

  const { data: questions } = await supabase
    .from('questions')
    .select('id, session_group_id, label')
    .in('session_group_id', (sessionGroups || []).map((sg) => sg.id))
    .order('sort_order', { ascending: true })

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('client_id', client.id)
    .order('submitted_at', { ascending: false })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-10 animate-fade-in">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8703A] to-[#D4A574] flex items-center justify-center text-xs font-bold text-white">
          BC
        </div>
        <span className="text-[#9CA3AF] text-sm tracking-wider uppercase">BuilderCamp</span>
      </div>

      <div className="flex items-center justify-between mb-8 animate-fade-in stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F0] mb-1">{client.name}</h1>
          <p className="text-[#9CA3AF] text-sm">
            {(submissions || []).length} response{(submissions || []).length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href={`/${clientSlug}`}
          className="text-sm text-[#9CA3AF] hover:text-[#E8703A] transition-colors"
        >
          &larr; Intake form
        </Link>
      </div>

      <div className="animate-fade-in stagger-2">
        <ResponsesTable
          sessionGroups={sessionGroups || []}
          questions={questions || []}
          submissions={submissions || []}
        />
      </div>
    </div>
  )
}
