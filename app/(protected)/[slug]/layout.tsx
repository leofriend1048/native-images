import { redirect } from "next/navigation";
import { getSession, getImpersonatorSession } from "@/lib/auth";
import { getWorkspacesByUserId, getWorkspaceMembership, getUserById, getWorkspaceBySlug, getChatsByUserAndWorkspace } from "@/lib/db";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { WorkspaceCookieSync } from "@/components/workspace-cookie-sync";

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

  const [membership, impersonator] = await Promise.all([
    getWorkspaceMembership(workspace.id, session.userId),
    getImpersonatorSession(),
  ]);

  // When impersonating, skip membership check — admin can view any workspace as any user
  if (!membership && !impersonator) {
    if (workspaces.length > 0) {
      redirect(`/${workspaces[0].slug}/chat`);
    }
    redirect("/login");
  }

  const [dbUser, recentChats] = await Promise.all([
    getUserById(session.userId),
    getChatsByUserAndWorkspace(session.userId, workspace.id),
  ]);

  // Find the admin's workspace slug for the "Exit" redirect
  let adminSlug = slug;
  if (impersonator) {
    const adminWorkspaces = await getWorkspacesByUserId(impersonator.userId);
    if (adminWorkspaces.length > 0) adminSlug = adminWorkspaces[0].slug;
  }

  return (
    <SidebarProvider>
      <WorkspaceCookieSync workspaceId={workspace.id} />
      <AppSidebar
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug }))}
        activeWorkspaceSlug={slug}
        user={{
          name: dbUser?.name || null,
          email: session.email,
          isAdmin: session.isAdmin,
        }}
        workspaceRole={membership?.role ?? "member"}
        initialChats={recentChats.map((c) => ({
          id: c.id,
          title: c.title,
          thumbnail_url: c.thumbnail_url,
          updated_at: c.updated_at,
        }))}
      />
      <main className="flex-1 flex flex-col min-h-0">
        {impersonator && (
          <ImpersonationBanner targetEmail={session.email} adminSlug={adminSlug} />
        )}
        <div className="md:hidden flex items-center h-10 px-2 border-b shrink-0">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
