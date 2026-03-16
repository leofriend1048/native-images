import { deletePersona } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  await deletePersona(id, ctx.session.userId);

  return new Response(null, { status: 204 });
}
