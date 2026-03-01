import { getSession } from "@/lib/auth";
import { createDeck, getDecksByUser, getGeneratedImagesByIds } from "@/lib/db";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const decks = await getDecksByUser(session.userId);

  // Collect first 4 image IDs per deck for thumbnail strips
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

  return Response.json({ decks: decksWithThumbs });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, imageIds } = await req.json();
  if (!title?.trim()) {
    return new Response(JSON.stringify({ error: "Title is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return new Response(JSON.stringify({ error: "At least one image is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify all image IDs belong to this user
  const images = await getGeneratedImagesByIds(imageIds);
  const ownedIds = images
    .filter((img) => img.user_id === session.userId)
    .map((img) => img.id);

  if (ownedIds.length === 0) {
    return new Response(JSON.stringify({ error: "No valid images found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = nanoid(24);
  const deck = await createDeck({
    id: nanoid(),
    user_id: session.userId,
    token,
    title: title.trim(),
    image_ids: JSON.stringify(ownedIds),
    active: 1,
  });

  return new Response(JSON.stringify({ deck, token }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
