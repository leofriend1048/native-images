import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkspaceBySlug, getDecksByUserAndWorkspace, getGeneratedImagesByIds } from "@/lib/db";
import DecksClient from "./decks-client";

export default async function DecksPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) redirect("/login");

  const decks = await getDecksByUserAndWorkspace(session.userId, workspace.id);

  // Resolve thumbnails (same logic as /api/decks GET)
  const allImageIds = decks.flatMap((d) => {
    try { return (JSON.parse(d.image_ids) as string[]).slice(0, 4); }
    catch { return []; }
  });
  const uniqueIds = [...new Set(allImageIds)];
  const images = uniqueIds.length > 0 ? await getGeneratedImagesByIds(uniqueIds) : [];
  const imageMap = new Map(images.map((img) => [img.id, img.url]));

  const decksWithThumbs = decks.map((deck) => {
    const ids: string[] = (() => {
      try { return JSON.parse(deck.image_ids) as string[]; }
      catch { return []; }
    })();
    return {
      ...deck,
      thumbnails: ids.slice(0, 4).map((id) => imageMap.get(id)).filter((u): u is string => !!u),
    };
  });

  return <DecksClient initialDecks={JSON.parse(JSON.stringify(decksWithThumbs))} />;
}
