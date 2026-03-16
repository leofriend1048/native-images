"use client";

import { useCallback, useEffect, useState } from "react";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Image as ImageIcon, Trash2, MessageSquare } from "lucide-react";
import { onChatListChanged } from "@/lib/chat-events";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface ChatSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
  updated_at: string;
}

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ChatHistory({ slug, initialChats }: { slug: string; initialChats?: ChatSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<ChatSummary[]>(initialChats ?? []);
  const base = `/${slug}`;

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChats(Array.isArray(data.chats) ? data.chats : []);
      }
    } catch { /* silent */ }
  }, []);

  // Only subscribe to change events for real-time updates (no initial fetch needed)
  useEffect(() => {
    return onChatListChanged(fetchChats);
  }, [fetchChats]);

  // Extract chat ID from path like /slug/chat/abc123
  const chatMatch = pathname.match(/\/chat\/([^/]+)/);
  const activeChatId = chatMatch ? chatMatch[1] : null;

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (activeChatId === chatId) router.push(`${base}/chat`);
      fetchChats();
    } catch {
      toast.error("Failed to delete chat");
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 px-3 text-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-[11px] text-muted-foreground">
                No chats yet
              </p>
            </div>
          ) : (
            chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  isActive={chat.id === activeChatId}
                  onClick={() => router.push(`${base}/chat/${chat.id}`)}
                  className="h-auto py-1.5"
                >
                  <div className="shrink-0 w-7 h-7 rounded overflow-hidden bg-muted border flex items-center justify-center relative">
                    {chat.thumbnail_url ? (
                      <NextImage
                        src={chat.thumbnail_url}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">
                      {chat.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                      {relativeTime(chat.updated_at)}
                    </p>
                  </div>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="opacity-0 group-hover/menu-item:opacity-100"
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
