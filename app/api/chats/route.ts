import { nanoid } from "nanoid";
import { getSession } from "@/lib/auth";
import { getChatsByUser, upsertChat } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getChatsByUser(session.userId);
  return Response.json({ chats });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
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
    user_id: session.userId,
    title: title?.slice(0, 120) || "Untitled",
    thumbnail_url: thumbnail_url ?? null,
    messages: JSON.stringify(messages ?? []),
  });

  return Response.json({ id: chatId });
}
