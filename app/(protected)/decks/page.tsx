"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
  PencilIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  LinkIcon,
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
  thumbnails: string[];
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

// ─── Deck card ────────────────────────────────────────────────────────────────

function DeckCard({
  deck,
  onToggleActive,
  onDelete,
  onRename,
  isToggling,
}: {
  deck: Deck;
  onToggleActive: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void>;
  isToggling: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(deck.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageCount = (() => {
    try { return (JSON.parse(deck.image_ids) as string[]).length; } catch { return 0; }
  })();
  const isActive = deck.active === 1;

  const startEdit = () => {
    setDraftTitle(deck.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const cancelEdit = () => { setEditing(false); setDraftTitle(deck.title); };

  const saveEdit = async () => {
    if (!draftTitle.trim() || draftTitle.trim() === deck.title) { cancelEdit(); return; }
    setSaving(true);
    try {
      await onRename(draftTitle.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/deck/${deck.token}`);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className={`group rounded-2xl border bg-card overflow-hidden transition-all duration-200 ${!isActive ? "opacity-60" : "hover:shadow-sm hover:border-border/80"}`}>
      {/* Thumbnail strip */}
      <div className="relative h-32 bg-muted overflow-hidden">
        {deck.thumbnails.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <LayersIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        ) : deck.thumbnails.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.thumbnails[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`grid h-full gap-0.5 ${deck.thumbnails.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {deck.thumbnails.slice(0, deck.thumbnails.length >= 3 ? 3 : 2).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0 h-4 shadow-sm"
          >
            {isActive ? "Live" : "Off"}
          </Badge>
        </div>

        {/* Image count */}
        <div className="absolute bottom-2 right-2 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
          {imageCount} image{imageCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start gap-2 mb-1">
          {editing ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                className="flex-1 min-w-0 text-sm font-medium bg-muted rounded px-2 py-0.5 outline-none ring-1 ring-primary"
                disabled={saving}
              />
              <button onClick={saveEdit} disabled={saving} className="shrink-0 text-primary hover:text-primary/80">
                <CheckIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={cancelEdit} disabled={saving} className="shrink-0 text-muted-foreground hover:text-foreground">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 group/title">
              <span className="text-sm font-semibold truncate">{deck.title}</span>
              <button
                onClick={startEdit}
                className="shrink-0 opacity-0 group-hover/title:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
          <span>{relativeTime(deck.created_at)}</span>
          <span>·</span>
          <span className="font-mono truncate">/deck/{deck.token.slice(0, 10)}…</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs flex-1"
            onClick={copyLink}
          >
            <LinkIcon className="h-3 w-3" />
            Copy link
          </Button>
          <Link href={`/deck/${deck.token}`} target="_blank">
            <Button size="sm" variant="outline" className="h-7 w-7 p-0">
              <ExternalLinkIcon className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            disabled={isToggling}
            onClick={onToggleActive}
            title={isActive ? "Deactivate link" : "Activate link"}
          >
            {isActive ? <EyeOffIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:border-destructive"
            onClick={onDelete}
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      setDecks((prev) => prev.map((d) => d.token === token ? { ...d, active: currentActive === 1 ? 0 : 1 } : d));
      toast.success(currentActive === 1 ? "Deck deactivated — link no longer works" : "Deck activated");
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

  const handleRename = useCallback(async (token: string, title: string) => {
    const res = await fetch(`/api/decks/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { toast.error("Failed to rename deck"); throw new Error(); }
    setDecks((prev) => prev.map((d) => d.token === token ? { ...d, title } : d));
    toast.success("Deck renamed");
  }, []);

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
                  <MessageSquareIcon className="h-3.5 w-3.5" />Chat
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <GalleryHorizontalIcon className="h-3.5 w-3.5" />Gallery
                </Button>
              </Link>
              <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
                <LayersIcon className="h-3.5 w-3.5" />Decks
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentUser?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <ShieldIcon className="h-3.5 w-3.5" />Admin
                </Button>
              </Link>
            )}
            <Link href="/docs">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <BookOpenIcon className="h-3.5 w-3.5" />Docs
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
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Your Decks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Shareable creative decks — send links to clients, no login required</p>
          </div>
          <Link href="/gallery">
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <PlusIcon className="h-3.5 w-3.5" />
              New deck
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                <Skeleton className="w-full h-32 rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-7 flex-1 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <LayersIcon className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-semibold">No decks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Gallery, select images, and click "Create deck"</p>
            </div>
            <Link href="/gallery">
              <Button size="sm" className="gap-1.5 text-xs">
                <GalleryHorizontalIcon className="h-3.5 w-3.5" />
                Go to Gallery
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                isToggling={togglingToken === deck.token}
                onToggleActive={() => handleToggleActive(deck.token, deck.active)}
                onDelete={() => setDeleteToken(deck.token)}
                onRename={(title) => handleRename(deck.token, title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteToken} onOpenChange={(v) => { if (!v) setDeleteToken(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this deck?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The share link will stop working immediately and the deck cannot be recovered.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteToken(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
