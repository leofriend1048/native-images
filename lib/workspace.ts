import { getSession, getActiveWorkspaceId, SessionPayload } from "./auth";
import { getWorkspaceMembership } from "./db";

export interface WorkspaceContext {
  session: SessionPayload;
  workspaceId: string;
  role: string;
}

/**
 * Verifies the current user has access to the active workspace.
 * Returns session + workspace context, or null if unauthorized.
 */
export async function requireWorkspaceAccess(): Promise<WorkspaceContext | null> {
  const session = await getSession();
  if (!session) return null;

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return null;

  const membership = await getWorkspaceMembership(workspaceId, session.userId);
  if (!membership) return null;

  return {
    session,
    workspaceId,
    role: membership.role,
  };
}

/**
 * Check if the user is a workspace admin (owner or admin role).
 */
export function isWorkspaceAdmin(ctx: WorkspaceContext): boolean {
  return ctx.role === "owner" || ctx.role === "admin";
}
