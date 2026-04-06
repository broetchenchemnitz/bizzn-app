import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { UtensilsCrossed, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Speisekarte wählen | Bizzn Dashboard",
};

export type Category = { id: string; name: string };
export type Dish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  category_id: string;
};

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Alle Projekte des Users abrufen
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const safeProjects = projects ?? [];

  // Kein Projekt → Dashboard
  if (safeProjects.length === 0) {
    redirect("/dashboard?no_project=1");
  }

  // Genau 1 Projekt → direkt weiterleiten
  if (safeProjects.length === 1) {
    redirect(`/dashboard/project/${safeProjects[0].id}/menu`);
  }

  // Mehrere Projekte → Auswahl-Screen
  return (
    <div className="min-h-full bg-[#1A1A1A] text-white">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#C7A17A] mb-2">
            Speisekarte verwalten
          </h1>
          <p className="text-gray-400">
            Du hast mehrere Betriebe. Wähle den Betrieb, dessen Speisekarte du verwalten möchtest.
          </p>
        </div>

        {/* Project Cards */}
        <div className="space-y-3">
          {safeProjects.map((project) => (
            <Link
              key={project.id}
              id={`btn-menu-project-${project.id}`}
              href={`/dashboard/project/${project.id}/menu`}
              className="group flex items-center justify-between bg-[#242424] border border-[#333333] hover:border-[#C7A17A]/50 hover:shadow-[0_0_20px_rgba(199,161,122,0.08)] rounded-xl p-5 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#C7A17A]/10 border border-[#C7A17A]/20 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-[#C7A17A]" />
                </div>
                <div>
                  <h2 className="font-semibold text-white group-hover:text-[#C7A17A] transition-colors">
                    {project.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Betrieb · Erstellt am{" "}
                    {new Date(project.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#C7A17A]/60 group-hover:text-[#C7A17A] transition-colors">
                <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-medium">Öffnen →</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
