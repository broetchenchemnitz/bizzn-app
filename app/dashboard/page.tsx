import { createClient } from '@/lib/supabase-server'
import { PlusCircle, FolderGit2 } from 'lucide-react'
import type { Database } from '@/types/supabase'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export const metadata = {
  title: 'Dashboard | Bizzn',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch projects securely via RLS (assuming RLS is active on Supabase)
  const { data: projectsRaw, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const projects = projectsRaw as ProjectRow[] | null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back, {user?.email || 'User'}.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-brand hover:bg-[#66b300] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <PlusCircle className="w-4 h-4" />
            New Project
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-gray-400" />
            Active Projects
          </h2>

          {error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
              Failed to load projects: {error.message}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500 mb-4">No projects found. You are ready to start building.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div key={project.id} className="p-4 border border-gray-100 rounded-lg hover:border-brand transition-colors cursor-pointer group">
                  <h3 className="font-medium text-gray-900 group-hover:text-brand transition-colors">{project.name}</h3>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
