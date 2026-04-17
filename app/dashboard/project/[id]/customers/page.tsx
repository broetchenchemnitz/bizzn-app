import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import CustomerManagement from './CustomerManagement'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kunden | Bizzn',
}

export default async function CustomersPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Ownership check
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  return (
    <div className="min-h-full bg-[#1A1A1A] text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        <CustomerManagement projectId={project.id} projectName={project.name} />
      </div>
    </div>
  )
}
