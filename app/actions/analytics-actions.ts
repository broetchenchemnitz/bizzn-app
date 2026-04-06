"use server";

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
