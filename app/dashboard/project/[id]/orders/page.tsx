import Link from 'next/link'
import { ArrowLeft, MonitorCheck, Maximize2 } from 'lucide-react'
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

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 smooth-transition">
      <div className="max-w-[1600px] mx-auto space-y-6 flex flex-col fade-in-up">

        {/* Back link */}
        <Link
          href={`/dashboard/project/${params.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-white smooth-transition group w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Zurück zum Dashboard
        </Link>

        {/* Header — KDS Title Card */}
        <div className="glass-card rounded-2xl p-6 md:p-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
              <MonitorCheck className="w-8 h-8 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Kitchen Display System
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                {project.name}
                <span className="text-white/20 mx-2">•</span>
                Live Bestellmanagement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-black/40 border border-white/5 rounded-full text-xs font-semibold text-gold tracking-widest uppercase shadow-inner">
              Gastro-OS v1
            </div>
            <Link
              href={`/dashboard/project/${params.id}/kitchen`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-amber-400 text-sm font-semibold transition-all"
            >
              <Maximize2 className="w-4 h-4" />
              Vollbild-Monitor
            </Link>
          </div>
        </div>

        {/* KDS Board Wrapper */}
        <div className="glass-card rounded-2xl flex flex-col shadow-2xl relative border-white/5">
          <KitchenDisplay projectId={params.id} />
        </div>

      </div>
    </div>
  )
}
