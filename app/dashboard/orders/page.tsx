import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { MonitorCheck, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'KDS (Bestellungen) | Bizzn Dashboard',
}

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .order('name')

  // Wenn nur ein Projekt → direkt weiterleiten
  if (projects && projects.length === 1) {
    redirect(`/dashboard/project/${projects[0].id}/orders`)
  }

  return (
    <div className="bg-[#1A1A1A] text-white min-h-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#C7A17A]">
          KDS (Bestellungen)
        </h1>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="bg-[#242424] border border-[#333333] rounded-xl p-8 text-center min-h-[30vh] flex flex-col justify-center">
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            Noch kein Betrieb angelegt
          </h2>
          <p className="text-gray-500 mb-4">
            Erstelle zuerst ein Restaurant-Profil, um Bestellungen zu empfangen.
          </p>
          <Link
            href="/dashboard"
            className="mx-auto px-4 py-2 bg-[#C7A17A] text-black rounded-lg font-semibold hover:bg-[#b8916a] transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/project/${project.id}/orders`}
              className="group bg-[#242424] border border-[#333333] hover:border-[#C7A17A]/40 rounded-xl p-6 flex items-center justify-between transition-all hover:bg-[#2a2a2a]"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <MonitorCheck className="w-6 h-6 text-[#C7A17A]" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">{project.name}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Kitchen Display öffnen</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#C7A17A] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
