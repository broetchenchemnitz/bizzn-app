import Link from 'next/link'
import { ArrowLeft, MonitorCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import KitchenDisplay from '@/components/KitchenDisplay'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bestellungen | Bizzn Gastro-OS',
}

export default async function OrdersPage({
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
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back link */}
        <div>
          <Link
            href={`/dashboard/project/${params.id}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-gray-400 group-hover:text-gray-600 transition-colors" />
            Zurück zum Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0FBD8] flex items-center justify-center shrink-0">
              <MonitorCheck className="w-6 h-6 text-[#77CC00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Kitchen Display System</h1>
              <p className="text-sm text-gray-500 mt-0.5">{project.name} · Live Bestellmanagement</p>
            </div>
            <span className="ml-auto text-xs font-semibold text-[#77CC00] bg-[#F0FBD8] px-3 py-1 rounded-full border border-[#77CC00]/20">
              Gastro-OS v1
            </span>
          </div>
        </div>

        {/* KDS Board */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <KitchenDisplay projectId={params.id} />
        </div>

      </div>
    </div>
  )
}
