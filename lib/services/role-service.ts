import { createAdminClient } from "@/lib/supabase-admin";

export type ProjectRole = 'owner' | 'admin' | 'staff';

export class RoleService {
  /**
   * Prüft die Rolle eines Users in einem spezifischen Projekt.
   * Nutzt Admin-Client für konsistenten Check (RLS-bypass).
   */
  async getUserRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.role as ProjectRole;
  }

  /**
   * Berechtigungs-Check — gibt true zurück wenn User mindestens eine der requiredRoles hat.
   */
  async hasPermission(
    projectId: string,
    userId: string,
    requiredRoles: ProjectRole[]
  ): Promise<boolean> {
    const role = await this.getUserRole(projectId, userId);
    if (!role) return false;
    return requiredRoles.includes(role);
  }
}

export const roleService = new RoleService();
