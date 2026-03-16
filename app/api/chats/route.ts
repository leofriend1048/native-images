import { nanoid } from "nanoid";
import { getChatsByUserAndWorkspace, upsertChat } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function GET() {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getChatsByUserAndWorkspace(ctx.session.userId, ctx.workspaceId);
  return Response.json({ chats });
}

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, thumbnail_url, messages } = body as {
    id?: string;
    title: string;
    thumbnail_url?: string | null;
    messages: unknown[];
  };

  const chatId = id ?? nanoid();

  await upsertChat({
    id: chatId,
    user_id: ctx.session.userId,
    workspace_id: ctx.workspaceId,
    title: title?.slice(0, 120) || "Untitled",
    thumbnail_url: thumbnail_url ?? null,
    messages: JSON.stringify(messages ?? []),
  });

  return Response.json({ id: chatId });
}
