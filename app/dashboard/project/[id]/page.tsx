import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import RestaurantOverview from '@/components/RestaurantOverview'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { getDashboardAnalyticsAction } from '@/app/actions/analytics-actions'
import BroadcastBlock from '@/components/dashboard/BroadcastBlock'
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

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  // Analytics — server-side, per project
  const { data: stats } = await getDashboardAnalyticsAction(project.id)

  const chartData = [
    { name: 'Woche 1', total: Math.round((stats?.totalRevenue ?? 0) * 0.20) / 100 },
    { name: 'Woche 2', total: Math.round((stats?.totalRevenue ?? 0) * 0.30) / 100 },
    { name: 'Woche 3', total: Math.round((stats?.totalRevenue ?? 0) * 0.15) / 100 },
    { name: 'Woche 4', total: Math.round((stats?.totalRevenue ?? 0) * 0.35) / 100 },
  ]

  return (
    <div className="min-h-screen bg-[#1A1A1A]">

      {/* Grid Body */}
      <div className="overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-8">
          <div className="grid grid-cols-12 gap-5">

            {/* MAIN — full width now that sidebar widgets are in left nav */}
            <div className="col-span-12 space-y-5 min-w-0">


              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <RestaurantOverview projectId={project.id} />
              </div>

              {/* Analytics Chart */}
              <div className="bg-[#242424] rounded-3xl border border-white/5 shadow-lg p-5">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Umsatzverlauf (Monat)</p>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl font-extrabold text-[#C7A17A]">
                    {((stats?.totalRevenue ?? 0) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className={`text-xs font-semibold ${
                    (stats?.revenueTrend ?? 0) >= 0 ? 'text-[#C7A17A]' : 'text-red-400'
                  }`}>
                    {(stats?.revenueTrend ?? 0) >= 0 ? '+' : ''}{(stats?.revenueTrend ?? 0).toFixed(1)}% vs. Vormonat
                  </span>
                </div>
                <RevenueChart data={chartData} />
              </div>

              {/* M18: Broadcast */}
              <BroadcastBlock projectId={project.id} />

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
