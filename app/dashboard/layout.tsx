import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Strict server-side validation of the token
  const { data: { user }, error } = await supabase.auth.getUser();

  // Immediate redirect if no valid user session exists
  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <section className="dashboard-layout min-h-screen bg-[#1a1a1a] text-white">
      {/* Future Dashboard Navigation/Sidebar can be injected here.
        For now, just render the protected child routes.
      */}
      {children}
    </section>
  );
}
