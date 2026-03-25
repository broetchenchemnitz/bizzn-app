import Link from 'next/link'
import { ArrowLeft, UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Einstellungen | Bizzn',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName: string = (user.user_metadata?.full_name as string | undefined) ?? ''
  const email: string = user.email ?? ''

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
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
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <UserCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Profil-Einstellungen</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Verwalte deinen Anzeigenamen und deine Kontodaten.
              </p>
            </div>
          </div>

          <ProfileForm initialName={fullName} email={email} />
        </div>
      </div>
    </div>
  )
}
