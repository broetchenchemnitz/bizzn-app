import { createAdminClient } from "@/lib/supabase-admin";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface AnalyticsData {
  totalRevenue: number;
  orderCount: number;
  revenueTrend: number; // Prozentsatz vs. Vormonat
  orderTrend: number;
  recentActivity: RecentActivity[];
}

interface RecentActivity {
  total_amount: number;
  created_at: string;
}

export class AnalyticsService {
  private supabase = createAdminClient();

  async getDashboardStats(projectId: string): Promise<AnalyticsData> {
    const now = new Date();
    const currentStart = startOfMonth(now).toISOString();
    const currentEnd = endOfMonth(now).toISOString();
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
    const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

    // 1. Umsatz & Orders aktueller Monat
    const { data: currentData, error: currentError } = await this.supabase
      .from("orders")
      .select("total_amount, created_at")
      .eq("project_id", projectId)
      .gte("created_at", currentStart)
      .lte("created_at", currentEnd);

    if (currentError) throw currentError;

    // 2. Umsatz & Orders Vormonat für Trend-Analyse
    const { data: lastMonthData, error: lastError } = await this.supabase
      .from("orders")
      .select("total_amount")
      .eq("project_id", projectId)
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd);

    if (lastError) throw lastError;

    const currentRevenue = currentData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0;
    const lastRevenue = lastMonthData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0;

    const currentOrders = currentData?.length ?? 0;
    const lastOrders = lastMonthData?.length ?? 0;

    // Trend-Berechnung (Safety against division by zero)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalRevenue: currentRevenue,
      orderCount: currentOrders,
      revenueTrend: calculateTrend(currentRevenue, lastRevenue),
      orderTrend: calculateTrend(currentOrders, lastOrders),
      recentActivity: (currentData ?? []).slice(0, 5),
    };
  }
}

export const analyticsService = new AnalyticsService();
