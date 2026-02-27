import { getSession } from "@/lib/auth";
import { getGeneratedImagesByUser } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const images = await getGeneratedImagesByUser(session.userId);
  return new Response(JSON.stringify({ images }), {
    headers: { "Content-Type": "application/json" },
  });
}
