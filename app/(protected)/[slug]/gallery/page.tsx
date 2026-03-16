import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceBySlug, getGeneratedImagesByUserAndWorkspace } from "@/lib/db";
import GalleryClient from "./gallery-client";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/login");

  const images = await getGeneratedImagesByUserAndWorkspace(session.userId, workspace.id);

  return <GalleryClient initialImages={JSON.parse(JSON.stringify(images))} />;
}
