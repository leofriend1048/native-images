"use client";

import { useEffect } from "react";

/**
 * Syncs the active-workspace cookie to match the workspace resolved from the URL slug.
 * Fires on mount and whenever workspaceId changes, ensuring API routes
 * (which read the cookie, not the URL) always target the correct workspace.
 */
export function WorkspaceCookieSync({ workspaceId }: { workspaceId: string }) {
  useEffect(() => {
    fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    }).catch(() => {});
  }, [workspaceId]);

  return null;
}
