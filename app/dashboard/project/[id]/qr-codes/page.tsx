import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import QRCodeGenerator from '@/components/QRCodeGenerator'
import type { Database } from '@/types/supabase'
import type { Metadata } from 'next'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const metadata: Metadata = {
  title: 'QR-Codes | Bizzn Dashboard',
  description: 'Generiere Tisch-QR-Codes für dein Restaurant.',
}

export default async function QRCodesPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single<ProjectRow>()

  if (!project) notFound()

  return (
    <div className="space-y-2">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">
          QR-Codes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Druckfertige QR-Codes für jeden Tisch — Gäste scannen, Speisekarte öffnet sich, Bestellung kommt direkt in deine Küche.
        </p>
      </div>

      <QRCodeGenerator
        slug={project.slug ?? null}
        projectName={project.name}
      />
    </div>
  )
}
