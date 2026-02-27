import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getChatById } from "@/lib/db";
import ChatPage from "../page";
import type { UIMessage } from "ai";

export default async function ChatByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const chat = await getChatById(id);
  if (!chat || chat.user_id !== session.userId) redirect("/chat");

  const messages = JSON.parse(chat.messages) as UIMessage[];

  return <ChatPage initialChatId={id} initialMessages={messages} />;
}
