import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import KitchenDisplayFullscreen from '@/components/KitchenDisplayFullscreen'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Küchen-Monitor | Bizzn',
}

export default async function KitchenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  return (
    <KitchenDisplayFullscreen
      projectId={params.id}
      projectName={project.name ?? 'Restaurant'}
      inStoreEnabled={project.in_store_enabled ?? false}
    />
  )
}
