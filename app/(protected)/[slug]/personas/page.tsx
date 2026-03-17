import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceBySlug, getPersonasByUserAndWorkspace } from "@/lib/db";
import PersonasClient from "./personas-client";

export default async function PersonasPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/login");

  const personas = await getPersonasByUserAndWorkspace(session.userId, workspace.id);

  return <PersonasClient initialPersonas={JSON.parse(JSON.stringify(personas))} />;
}
