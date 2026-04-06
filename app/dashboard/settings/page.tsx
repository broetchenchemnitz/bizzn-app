import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Einstellungen | Bizzn",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="bg-[#1A1A1A] text-white min-h-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#C7A17A] mb-8">
          Profil-Einstellungen
        </h1>

        <div className="bg-[#242424] border border-[#333333] rounded-xl shadow-lg p-8">
          <p className="text-sm text-gray-400 mb-6">
            Verwalte deinen Anzeigenamen und deine Kontodaten.
          </p>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="settings-email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                E-Mail-Adresse
              </label>
              <input
                id="settings-email"
                type="text"
                disabled
                value={user?.email || ""}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-gray-500 cursor-not-allowed focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Die E-Mail-Adresse kann nicht geändert werden.
              </p>
            </div>

            <div>
              <label
                htmlFor="settings-display-name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Anzeigename
              </label>
              <input
                id="settings-display-name"
                type="text"
                placeholder="Dein vollständiger Name"
                defaultValue={
                  (user?.user_metadata?.full_name as string | undefined) ?? ""
                }
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-md p-3 text-white focus:outline-none focus:border-[#C7A17A] focus:ring-1 focus:ring-[#C7A17A] transition-colors"
              />
            </div>

            <div className="pt-4">
              <button
                id="btn-settings-save"
                className="bg-[#C7A17A] hover:bg-[#B58E62] text-[#1A1A1A] font-semibold py-2.5 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#242424] focus:ring-[#C7A17A]"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
