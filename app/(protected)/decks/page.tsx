"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayersIcon,
  CopyIcon,
  TrashIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  BookOpenIcon,
  UserCircleIcon,
  ShieldIcon,
  GalleryHorizontalIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Deck {
  id: string;
  token: string;
  title: string;
  image_ids: string;
  active: number;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const utc = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const ms = Date.now() - new Date(utc).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(utc).toLocaleDateString();
}

export default function DecksPage() {
  const [currentUser, setCurrentUser] = useState<{ name: string | null; email: string; isAdmin: boolean } | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingToken, setTogglingToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => {});

    fetch("/api/decks")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.decks)) setDecks(d.decks); })
      .catch(() => toast.error("Failed to load decks"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActive = useCallback(async (token: string, currentActive: number) => {
    setTogglingToken(token);
    try {
      const res = await fetch(`/api/decks/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: currentActive === 1 ? false : true }),
      });
      if (!res.ok) throw new Error();
      setDecks((prev) =>
        prev.map((d) => d.token === token ? { ...d, active: currentActive === 1 ? 0 : 1 } : d)
      );
      toast.success(currentActive === 1 ? "Deck deactivated" : "Deck activated");
    } catch {
      toast.error("Failed to update deck");
    } finally {
      setTogglingToken(null);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/decks/${deleteToken}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDecks((prev) => prev.filter((d) => d.token !== deleteToken));
      toast.success("Deck deleted");
    } catch {
      toast.error("Failed to delete deck");
    } finally {
      setDeleting(false);
      setDeleteToken(null);
    }
  }, [deleteToken]);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/deck/${token}`);
    toast.success("Link copied");
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-background">
                  <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
                  <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                  <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                  <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight">Native Ads</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Link href="/chat">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <MessageSquareIcon className="h-3.5 w-3.5" />
                  Chat
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <GalleryHorizontalIcon className="h-3.5 w-3.5" />
                  Gallery
                </Button>
              </Link>
              <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
                <LayersIcon className="h-3.5 w-3.5" />
                Decks
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentUser?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
            )}
            <Link href="/docs">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <BookOpenIcon className="h-3.5 w-3.5" />
                Docs
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-semibold shrink-0">
                  {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : <UserCircleIcon className="h-3 w-3" />}
                </div>
                {currentUser?.name ? currentUser.name.trim().split(/\s+/)[0] : "Account"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Your Decks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Shareable creative decks you&apos;ve created</p>
          </div>
          <Link href="/gallery">
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <LayersIcon className="h-3.5 w-3.5" />
              Create new deck
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-muted-foreground">Loading decks…</div>
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <LayersIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">No decks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Select images in the Gallery and click "Create deck"</p>
            </div>
            <Link href="/gallery">
              <Button size="sm" className="gap-1.5 text-xs">Go to Gallery</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => {
              const imageCount = (() => {
                try { return (JSON.parse(deck.image_ids) as string[]).length; }
                catch { return 0; }
              })();
              const deckUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/deck/${deck.token}`;
              const isActive = deck.active === 1;
              const isToggling = togglingToken === deck.token;

              return (
                <div
                  key={deck.id}
                  className={`rounded-xl border bg-card p-4 flex items-center gap-4 transition-opacity ${!isActive ? "opacity-60" : ""}`}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{deck.title}</span>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {isActive ? "Live" : "Deactivated"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {imageCount} image{imageCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{relativeTime(deck.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground truncate bg-muted px-2 py-0.5 rounded">
                        /deck/{deck.token}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => copyLink(deck.token)}
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                    <Link href={`/deck/${deck.token}`} target="_blank">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={isToggling}
                      onClick={() => handleToggleActive(deck.token, deck.active)}
                      title={isActive ? "Deactivate — link will stop working" : "Activate — link will work again"}
                    >
                      {isActive
                        ? <><EyeOffIcon className="h-3.5 w-3.5" />Deactivate</>
                        : <><EyeIcon className="h-3.5 w-3.5" />Activate</>
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteToken(deck.token)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteToken} onOpenChange={(v) => { if (!v) setDeleteToken(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete deck?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The share link will stop working immediately. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteToken(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
