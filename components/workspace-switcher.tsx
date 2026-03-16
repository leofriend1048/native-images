"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceSlug,
}: {
  workspaces: Workspace[];
  activeWorkspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [switching, setSwitching] = useState(false);
  const activeWorkspace = workspaces.find((w) => w.slug === activeWorkspaceSlug) || workspaces[0];

  const handleSwitch = async (workspace: Workspace) => {
    if (workspace.slug === activeWorkspaceSlug) return;
    setSwitching(true);
    try {
      await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      // Replace the slug in the current path and navigate
      const subPath = pathname.replace(`/${activeWorkspaceSlug}`, "") || "/chat";
      window.location.href = `/${workspace.slug}${subPath}`;
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateWorkspace = () => {
    router.push(`/${activeWorkspaceSlug}/settings?tab=new-workspace`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {switching ? "Switching..." : activeWorkspace?.name || "Select workspace"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeWorkspace?.slug}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitch(workspace)}
                className="gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded bg-muted shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">{workspace.name}</span>
                {workspace.slug === activeWorkspaceSlug && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateWorkspace} className="gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-6 h-6 rounded border border-dashed shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span>Create workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
