import { getSession } from "@/lib/auth";
import { getChatById, deleteChat } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const chat = await getChatById(id);

  if (!chat || chat.user_id !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    ...chat,
    messages: JSON.parse(chat.messages),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const chat = await getChatById(id);

  if (!chat || chat.user_id !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deleteChat(id);
  return Response.json({ ok: true });
}
