"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      id="btn-logout"
      onClick={handleLogout}
      className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:text-[#C7A17A] hover:bg-[#C7A17A]/10 transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C7A17A]/50"
    >
      Abmelden
    </button>
  );
}
