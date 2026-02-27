"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import { PlusIcon, CopyIcon, ImageIcon, CheckIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

type ModelId =
  | "google/nano-banana-pro"
  | "google/nano-banana-2"
  | "bytedance/seedream-4.5"
  | "ideogram-ai/ideogram-v3-turbo";

interface AnyToolPart {
  type: string;
  toolName?: string;
  state: string;
  output?: { success?: boolean; imageUrl?: string };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODELS: { id: ModelId; label: string; provider: string }[] = [
  { id: "google/nano-banana-2",          label: "Nano Banana 2",    provider: "google"    },
  { id: "google/nano-banana-pro",        label: "Nano Banana Pro",  provider: "google"    },
  { id: "bytedance/seedream-4.5",        label: "Seedream 4.5",     provider: "bytedance" },
  { id: "ideogram-ai/ideogram-v3-turbo", label: "Ideogram v3 Turbo", provider: "ideogram" },
];

function getLastImageUrl(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    for (const p of (messages[i].parts ?? [])) {
      const tp = p as AnyToolPart;
      const name = tp.toolName ?? tp.type?.replace(/^tool-/, "") ?? "";
      if (name === "generateImage" && tp.state === "output-available") {
        if (tp.output?.success && tp.output.imageUrl) return tp.output.imageUrl;
      }
    }
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({
  savedChats,
  currentModel,
  messages,
  onSelectChat,
  onNewChat,
  onSetModel,
}: {
  savedChats: ChatSummary[];
  currentModel: ModelId;
  messages: UIMessage[];
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onSetModel: (model: ModelId) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    // Tiny delay so the dialog closes cleanly before the action fires
    setTimeout(fn, 50);
  }, []);

  const lastImageUrl = getLastImageUrl(messages);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton={false}
      className="max-w-lg"
    >
      <CommandInput placeholder="Search chats, switch model, copy image…" />
      <CommandList className="max-h-[440px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Actions ──────────────────────────────────────── */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onNewChat)}>
            <PlusIcon className="size-4 shrink-0" />
            <span>New chat</span>
          </CommandItem>

          {lastImageUrl && (
            <CommandItem
              onSelect={() =>
                run(() => {
                  navigator.clipboard.writeText(lastImageUrl);
                  toast.success("Image URL copied to clipboard");
                })
              }
            >
              <CopyIcon className="size-4 shrink-0" />
              <span>Copy last image URL</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Model switch ─────────────────────────────────── */}
        <CommandGroup heading="Switch model">
          {MODELS.map((m) => {
            const isActive = m.id === currentModel;
            return (
              <CommandItem
                key={m.id}
                value={`model ${m.label} ${m.provider}`}
                onSelect={() => run(() => onSetModel(m.id))}
              >
                <ModelSelectorLogo provider={m.provider} className="size-4 shrink-0" />
                <span className={isActive ? "font-medium" : ""}>{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.provider.charAt(0).toUpperCase() + m.provider.slice(1)}</span>
                {isActive && <CheckIcon className="size-3.5 ml-auto text-primary shrink-0" />}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* ── Recent chats ─────────────────────────────────── */}
        {savedChats.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent chats">
              {savedChats.slice(0, 10).map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={`chat ${chat.title}`}
                  onSelect={() => run(() => onSelectChat(chat.id))}
                >
                  <div className="size-5 rounded overflow-hidden shrink-0 bg-muted border flex items-center justify-center">
                    {chat.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chat.thumbnail_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-3 text-muted-foreground/50" />
                    )}
                  </div>
                  <span className="truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
