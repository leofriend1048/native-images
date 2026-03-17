"use client";

import { useState } from "react";
import { EyeIcon, Loader2 } from "lucide-react";

export function ImpersonationBanner({ targetEmail, adminSlug }: { targetEmail: string; adminSlug: string }) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      if (res.ok) {
        // Hard navigation to pick up the swapped session cookie
        window.location.href = `/${adminSlug}/admin`;
        return;
      }
    } catch {}
    setExiting(false);
  };

  return (
    <div className="bg-amber-500 text-black px-4 py-1.5 text-center text-sm font-medium flex items-center justify-center gap-2 shrink-0">
      <EyeIcon className="h-3.5 w-3.5" />
      <span>Viewing as {targetEmail}</span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="ml-2 px-2.5 py-0.5 rounded bg-black/20 hover:bg-black/30 transition-colors text-xs font-semibold disabled:opacity-50"
      >
        {exiting ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Exit"}
      </button>
    </div>
  );
}
