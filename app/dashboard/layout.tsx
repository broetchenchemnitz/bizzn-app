import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ReactNode } from "react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import SidebarPreviewLink from "@/components/dashboard/SidebarPreviewLink";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ─── Auth Guard (Server-Side) ───────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#16161E] text-[#F0F0F8] flex flex-col md:flex-row font-sans selection:bg-[#E8B86D] selection:text-[#16161E]">
      {/* ── Sidebar Navigation ────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-[#1F1F2E] border-b md:border-b-0 md:border-r border-[#2E2E40] flex flex-col shadow-xl flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-[#2E2E40]">
          <Link href="/dashboard" aria-label="Bizzn Dashboard Home">
            <h1 className="text-2xl font-bold text-[#E8B86D] tracking-wider uppercase hover:opacity-80 transition-opacity">
              Bizzn<span className="text-white">.de</span>
            </h1>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-4 space-y-1" aria-label="Dashboard Navigation">
          <NavLink href="/dashboard" id="nav-uebersicht">
            <IconOverview />
            Übersicht
          </NavLink>
          <NavLink href="/dashboard/orders" id="nav-kds">
            <IconKDS />
            KDS (Bestellungen)
          </NavLink>
          <NavLink href="/dashboard/menu" id="nav-menu">
            <IconMenu />
            Speisekarte
          </NavLink>
          <SidebarPreviewLink />
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-[#2E2E40]">
          <div className="mb-2 px-2 text-xs text-[#9090A8] truncate" title={user.email ?? ""}>
            {user.email}
          </div>
          {user.email === process.env.SUPERADMIN_EMAIL && (
            <Link
              href="/superadmin"
              className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-md transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Superadmin
            </Link>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#16161E]">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function NavLink({
  href,
  id,
  children,
}: {
  href: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <Link
      id={id}
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-md text-[#8080A0] hover:bg-[#E8B86D]/10 hover:text-[#E8B86D] transition-all duration-150 font-medium text-sm"
    >
      {children}
    </Link>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconOverview() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconKDS() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
