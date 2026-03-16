import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspacesByUserId, getWorkspaceMembership, getUserById, getWorkspaceBySlug, getChatsByUserAndWorkspace } from "@/lib/db";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const workspaces = await getWorkspacesByUserId(session.userId);

  // Resolve workspace from slug
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    // Invalid slug — redirect to their default workspace
    if (workspaces.length > 0) {
      redirect(`/${workspaces[0].slug}/chat`);
    }
    redirect("/login");
  }

  // Verify membership
  const membership = await getWorkspaceMembership(workspace.id, session.userId);
  if (!membership) {
    // Not a member — redirect to their first workspace
    if (workspaces.length > 0) {
      redirect(`/${workspaces[0].slug}/chat`);
    }
    redirect("/login");
  }

  const [dbUser, recentChats] = await Promise.all([
    getUserById(session.userId),
    getChatsByUserAndWorkspace(session.userId, workspace.id),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug }))}
        activeWorkspaceSlug={slug}
        user={{
          name: dbUser?.name || null,
          email: session.email,
          isAdmin: session.isAdmin,
        }}
        workspaceRole={membership.role}
        initialChats={recentChats.map((c) => ({
          id: c.id,
          title: c.title,
          thumbnail_url: c.thumbnail_url,
          updated_at: c.updated_at,
        }))}
      />
      <main className="flex-1 flex flex-col min-h-0">
        <div className="md:hidden flex items-center h-10 px-2 border-b shrink-0">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
