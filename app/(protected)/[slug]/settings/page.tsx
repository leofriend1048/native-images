import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceBySlug, getWorkspaceMembers, getWorkspaceMembership, getInvitesByWorkspace } from "@/lib/db";
import SettingsClient from "./settings-client";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/login");

  const [members, membership] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    getWorkspaceMembership(workspace.id, session.userId),
  ]);

  if (!membership) redirect("/login");

  const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
  const invites = isOwnerOrAdmin ? await getInvitesByWorkspace(workspace.id) : [];

  return (
    <Suspense>
      <SettingsClient
        initialWorkspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          hasApiKeys: !!(workspace.anthropic_api_key_enc && workspace.replicate_api_token_enc),
          created_at: workspace.created_at,
        }}
        initialMembers={JSON.parse(JSON.stringify(members))}
        initialInvites={JSON.parse(JSON.stringify(invites))}
        role={membership.role}
      />
    </Suspense>
  );
}
