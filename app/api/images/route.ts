import { getGeneratedImagesByUserAndWorkspace } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function GET() {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const images = await getGeneratedImagesByUserAndWorkspace(ctx.session.userId, ctx.workspaceId);
  return new Response(JSON.stringify({ images }), {
    headers: { "Content-Type": "application/json" },
  });
}
