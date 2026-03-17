import { getPersonasByUserAndWorkspace, createPersona } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { nanoid } from "nanoid";

export async function GET() {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const personas = await getPersonasByUserAndWorkspace(ctx.session.userId, ctx.workspaceId);
  return new Response(JSON.stringify({ personas }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
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
    user_id: ctx.session.userId,
    workspace_id: ctx.workspaceId,
    name: name.trim(),
    description: description.trim(),
    research: null,
    research_status: "none",
  });

  return new Response(JSON.stringify({ persona }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
