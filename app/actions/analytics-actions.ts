"use server";

import { createClient } from "@/lib/supabase-server";
import { analyticsService } from "@/lib/services/analytics-service";

/**
 * Holt die aggregierten Dashboard-Statistiken für ein spezifisches Projekt.
 * Nutzt den AnalyticsService für die Berechnungen auf Server-Ebene.
 */
export async function getDashboardAnalyticsAction(projectId: string) {
  try {
    if (!projectId) {
      throw new Error("Missing projectId for analytics aggregation");
    }

    // ── Auth Guard: Session + Ownership ─────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Nicht authentifiziert." };
    }

    // Ownership-Check: Nur der Projekt-Owner darf Analytics abrufen
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return { data: null, error: "Keine Berechtigung." };
    }

    const stats = await analyticsService.getDashboardStats(projectId);

    return {
      data: stats,
      error: null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fehler beim Abrufen der Analyse-Daten";
    console.error("❌ Analytics Action Error:", message);
    return {
      data: null,
      error: message,
    };
  }
}
