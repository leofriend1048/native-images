import { redirect } from "next/navigation";
import { getSession, getActiveWorkspaceId } from "@/lib/auth";
import { getWorkspaceById, getWorkspacesByUserId } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Find the active workspace slug
  const activeWsId = await getActiveWorkspaceId();
  if (activeWsId) {
    const ws = await getWorkspaceById(activeWsId);
    if (ws) redirect(`/${ws.slug}/chat`);
  }

  // Fallback: use first workspace
  const workspaces = await getWorkspacesByUserId(session.userId);
  if (workspaces.length > 0) {
    redirect(`/${workspaces[0].slug}/chat`);
  }

  redirect("/login");
}
