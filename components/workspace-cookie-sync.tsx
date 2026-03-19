"use client";

import { useEffect, useRef } from "react";

/**
 * Syncs the active-workspace cookie to match the workspace resolved from the URL slug.
 * Runs once on mount — if the cookie is missing or stale, this ensures API routes
 * (which read the cookie, not the URL) target the correct workspace.
 */
export function WorkspaceCookieSync({ workspaceId }: { workspaceId: string }) {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    }).catch(() => {});
  }, [workspaceId]);

  return null;
}
