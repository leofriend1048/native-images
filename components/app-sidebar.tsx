"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquarePen,
  GalleryHorizontal,
  Layers,
  Users,
  Shield,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ChatHistory } from "./chat-history";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface ChatSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
  updated_at: string;
}

interface AppSidebarProps {
  workspaces: Workspace[];
  activeWorkspaceSlug: string;
  user: {
    name: string | null;
    email: string;
    isAdmin: boolean;
  };
  workspaceRole: string | null;
  initialChats?: ChatSummary[];
}

export function AppSidebar({ workspaces, activeWorkspaceSlug, user, workspaceRole, initialChats }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${activeWorkspaceSlug}`;

  const showAdmin = user.isAdmin || workspaceRole === "owner" || workspaceRole === "admin";

  const navItems = [
    { title: "Gallery", href: `${base}/gallery`, icon: GalleryHorizontal },
    { title: "Decks", href: `${base}/decks`, icon: Layers },
    { title: "Personas", href: `${base}/personas`, icon: Users },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceSlug={activeWorkspaceSlug}
        />
        {/* New Chat button */}
        <button
          onClick={() => router.push(`${base}/chat`)}
          className="group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary-foreground/15">
            <SquarePen className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">New Chat</span>
        </button>
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/admin")}>
                    <Link href={`${base}/admin`}>
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/settings")}>
                  <Link href={`${base}/settings`}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Chat history */}
        <ChatHistory slug={activeWorkspaceSlug} initialChats={initialChats} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold shrink-0">
                    {user.name ? user.name.trim().charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`${base}/account`} className="gap-2">
                    <User className="h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
