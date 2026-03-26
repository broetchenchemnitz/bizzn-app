import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ProjectSettingsBlock from '@/components/ProjectSettingsBlock'
import SlugSettingsBlock from '@/components/SlugSettingsBlock'
import RestaurantOverview from '@/components/RestaurantOverview'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const metadata = {
  title: 'Restaurant Dashboard | Bizzn',
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
            Zurück zum Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <ProjectSettingsBlock projectId={project.id} initialName={project.name} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <SlugSettingsBlock projectId={project.id} initialSlug={project.slug ?? null} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Restaurant Übersicht</h2>
            <span className="text-xs font-semibold text-[#77CC00] bg-[#F0FBD8] px-3 py-1 rounded-full border border-[#77CC00]/20">
              Gastro-OS v1
            </span>
          </div>
          <RestaurantOverview projectId={project.id} />
        </div>
      </div>
    </div>
  )
}
