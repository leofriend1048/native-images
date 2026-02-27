import { getSession } from "@/lib/auth";
import { getDeckByToken, getGeneratedImagesByIds, deleteDeckById, setDeckActive } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const deck = await getDeckByToken(token);

  if (!deck) {
    return Response.json({ error: "Deck not found" }, { status: 404 });
  }

  const imageIds: string[] = JSON.parse(deck.image_ids || "[]");
  const images = await getGeneratedImagesByIds(imageIds);

  const ordered = imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean);

  return Response.json({
    deck: { id: deck.id, title: deck.title, token: deck.token, created_at: deck.created_at },
    images: ordered,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const deck = await getDeckByToken(token);

  if (!deck || deck.user_id !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deleteDeckById(deck.id);
  return Response.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const deck = await getDeckByToken(token);

  if (!deck || deck.user_id !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { active } = await req.json();
  await setDeckActive(deck.id, active);
  return Response.json({ ok: true });
}
