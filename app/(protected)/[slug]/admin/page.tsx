import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceBySlug, getUsersWithStatsByWorkspace, getInvitesByWorkspace, getAllWorkspaces } from "@/lib/db";
import AdminClient from "./admin-client";

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/login");

  const isGlobalAdmin = process.env.ADMIN_EMAIL
    ? session.email === process.env.ADMIN_EMAIL
    : session.isAdmin;

  const [users, invites, allWorkspaces] = await Promise.all([
    getUsersWithStatsByWorkspace(workspace.id),
    getInvitesByWorkspace(workspace.id),
    isGlobalAdmin ? getAllWorkspaces() : Promise.resolve([]),
  ]);

  return (
    <AdminClient
      initialUsers={JSON.parse(JSON.stringify(users))}
      initialInvites={JSON.parse(JSON.stringify(invites))}
      currentWorkspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      allWorkspaces={isGlobalAdmin ? JSON.parse(JSON.stringify(allWorkspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug })))) : undefined}
    />
  );
}
