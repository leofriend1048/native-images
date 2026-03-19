import { getSession, getActiveWorkspaceId, SessionPayload } from "./auth";
import { getWorkspaceMembership, getWorkspacesByUserId } from "./db";

export interface WorkspaceContext {
  session: SessionPayload;
  workspaceId: string;
  role: string;
}

/**
 * Verifies the current user has access to the active workspace.
 * Falls back to the user's first workspace if the cookie is missing
 * (e.g. pre-multi-tenant session, or cookie sync hasn't completed yet).
 * Returns session + workspace context, or null if unauthorized.
 */
export async function requireWorkspaceAccess(): Promise<WorkspaceContext | null> {
  const session = await getSession();
  if (!session) return null;

  let workspaceId = await getActiveWorkspaceId();

  // Fallback: if no workspace cookie, use the user's first workspace
  if (!workspaceId) {
    const workspaces = await getWorkspacesByUserId(session.userId);
    if (workspaces.length === 0) return null;
    workspaceId = workspaces[0].id;
  }

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
