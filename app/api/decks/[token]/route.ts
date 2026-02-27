import { getDeckByToken, getGeneratedImagesByIds } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const deck = await getDeckByToken(token);

  if (!deck) {
    return new Response(JSON.stringify({ error: "Deck not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const imageIds: string[] = JSON.parse(deck.image_ids || "[]");
  const images = await getGeneratedImagesByIds(imageIds);

  // Return images in the order they were saved to the deck
  const ordered = imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean);

  return new Response(
    JSON.stringify({
      deck: { id: deck.id, title: deck.title, token: deck.token, created_at: deck.created_at },
      images: ordered,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
