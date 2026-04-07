import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import ProjectSettingsBlock from "@/components/ProjectSettingsBlock";
import SlugSettingsBlock from "@/components/SlugSettingsBlock";
import ProfileSettingsBlock from "@/components/ProfileSettingsBlock";
import WelcomeDiscountBlock from "@/components/WelcomeDiscountBlock";
import DiscoverySettingsBlock from "@/components/DiscoverySettingsBlock";
import { Settings, Globe, Trash2, Store, Tag, Search } from "lucide-react";
import type { Database } from "@/types/supabase";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Betrieb-Einstellungen | Bizzn",
};

export default async function ProjectSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single<ProjectRow>();

  if (!project) notFound();

  return (
    <div className="min-h-full bg-[#1A1A1A] text-white">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#C7A17A] mb-1">
            Betrieb-Einstellungen
          </h1>
          <p className="text-gray-400 text-sm">
            Verwalte Name, Web-Adresse und weitere Optionen für{" "}
            <span className="text-white font-medium">{project.name}</span>.
          </p>
        </div>

        {/* Betrieb umbenennen + Betriebs-ID */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#333333] pb-4 mb-4">
            <Settings className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Allgemein
            </h2>
          </div>
          <ProjectSettingsBlock
            projectId={project.id}
            initialName={project.name}
          />
        </section>

        {/* M14: Restaurant-Profil */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-[#333333] pb-4 mb-5">
            <Store className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Restaurant-Profil
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Diese Informationen erscheinen auf deiner öffentlichen Profilseite{" "}
            <span className="text-[#C7A17A] font-mono">{project.slug}.bizzn.de</span>.
          </p>
          <ProfileSettingsBlock
            projectId={project.id}
            initialData={{
              description: project.description,
              address: project.address,
              phone: project.phone,
              cuisine_type: project.cuisine_type,
              cover_image_url: project.cover_image_url,
              opening_hours: project.opening_hours as Record<string, string> | null,
            }}
          />
        </section>

        {/* M16: Willkommensrabatt */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-[#333333] pb-4 mb-5">
            <Tag className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Willkommensrabatt
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Neue Kunden erhalten einen Rabatt auf ihre erste Bestellung — direkt im Warenkorb sichtbar.
            Das ist dein stärkstes Werkzeug, um Gäste von Lieferando abzuwerben.
          </p>
          <WelcomeDiscountBlock
            projectId={project.id}
            initialEnabled={project.welcome_discount_enabled ?? false}
            initialPct={project.welcome_discount_pct ?? 10}
          />
        </section>

        {/* M17: Discovery-Opt-in */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-[#333333] pb-4 mb-5">
            <Search className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Auf bizzn.de entdeckt werden
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Lass dich von Neukunden auf{" "}
            <span className="text-[#C7A17A] font-mono">bizzn.de</span>{" "}
            finden — 0 % Provision, keine Listinggebühr.
            Du entscheidest, wann du sichtbar wirst.
          </p>
          <DiscoverySettingsBlock
            projectId={project.id}
            initialIsPublic={project.is_public ?? false}
            initialCity={(project.city as string | null) ?? null}
            initialPostalCode={(project.postal_code as string | null) ?? null}
          />
        </section>

        {/* Web-Adresse (Slug) */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-[#333333] pb-4 mb-5">
            <Globe className="w-4 h-4 text-[#C7A17A]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Storefront Web-Adresse
            </h2>
          </div>
          <SlugSettingsBlock
            projectId={project.id}
            initialSlug={project.slug ?? null}
          />
        </section>

        {/* Betriebs-ID (read-only Info) */}
        <section className="bg-[#242424] border border-[#333333] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Technische Informationen
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Betriebs-ID</p>
              <code className="text-xs font-mono text-gray-400 bg-[#1A1A1A] border border-[#333333] px-3 py-2 rounded-md block break-all">
                {project.id}
              </code>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Erstellt am</p>
              <p className="text-sm text-gray-300">
                {new Date(project.created_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Gefahrenzone */}
        <section className="bg-[#1A1A1A] border border-red-900/40 rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-red-900/30 pb-4 mb-5">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
              Gefahrenzone
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Löscht diesen Betrieb unwiderruflich — inklusive aller Speisekarten,
            Bestellungen und Kategorien.
          </p>
          {/* ProjectSettingsBlock enthält den Löschen-Button */}
          <ProjectSettingsBlock
            projectId={project.id}
            initialName={project.name}
            dangerZoneOnly
          />
        </section>

      </div>
    </div>
  );
}
