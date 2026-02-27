import { getSession } from "@/lib/auth";
import { getPersonasByUser, createPersona } from "@/lib/db";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const personas = await getPersonasByUser(session.userId);
  return new Response(JSON.stringify({ personas }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, description } = await req.json();
  if (!name?.trim() || !description?.trim()) {
    return new Response(JSON.stringify({ error: "Name and description are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const persona = await createPersona({
    id: nanoid(),
    user_id: session.userId,
    name: name.trim(),
    description: description.trim(),
  });

  return new Response(JSON.stringify({ persona }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
