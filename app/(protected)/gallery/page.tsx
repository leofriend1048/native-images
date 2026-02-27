"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  DownloadIcon,
  CopyIcon,
  CheckCircleIcon,
  XIcon,
  PanelLeftIcon,
  ImageIcon,
  FilterIcon,
  MessageSquareIcon,
  BookOpenIcon,
  UserCircleIcon,
  ShieldIcon,
  LayersIcon,
  GalleryHorizontalIcon,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  chat_id: string | null;
  created_at: string;
}

const MODEL_LABELS: Record<string, string> = {
  "google/nano-banana-pro": "Nano Banana Pro",
  "google/nano-banana-2": "Nano Banana 2",
  "bytedance/seedream-4.5": "Seedream 4.5",
  "ideogram-ai/ideogram-v3-turbo": "Ideogram v3",
};

function relativeTime(dateStr: string): string {
  // SQLite CURRENT_TIMESTAMP is UTC but lacks a timezone marker — force UTC parsing.
  const utc = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  const ms = Date.now() - new Date(utc).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function GalleryCard({
  image,
  selected,
  onToggleSelect,
}: {
  image: GeneratedImage;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `native-ad-${image.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <>
      <div
        className={`group relative rounded-xl overflow-hidden border bg-muted transition-all duration-150 ${
          selected
            ? "ring-2 ring-primary border-primary"
            : "hover:border-foreground/20"
        }`}
      >
        {/* Selection checkbox — always visible, stronger on hover/selected */}
        <button
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${
            selected
              ? "bg-primary border-primary scale-110"
              : "bg-black/40 border-white/80 opacity-60 group-hover:opacity-100 group-hover:bg-black/60 group-hover:scale-105"
          }`}
          onClick={onToggleSelect}
          title={selected ? "Deselect" : "Select"}
        >
          {selected
            ? <CheckCircleIcon className="h-3.5 w-3.5 text-primary-foreground" />
            : <span className="w-2.5 h-2.5 rounded-full border border-white/70" />
          }
        </button>

        {/* Selected overlay */}
        {selected && (
          <div className="absolute inset-0 z-[1] bg-primary/10 pointer-events-none" />
        )}

        {/* Image — click to select, double-click to fullscreen */}
        <div
          className="cursor-pointer"
          onClick={onToggleSelect}
          onDoubleClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full object-cover"
          />
        </div>

        {/* Meta overlay */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
              {image.aspect_ratio}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {MODEL_LABELS[image.model] ?? image.model}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">{relativeTime(image.created_at)}</span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{image.prompt}</p>

          <div className="flex items-center gap-1 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] gap-1"
              onClick={handleDownload}
            >
              <DownloadIcon className="h-2.5 w-2.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] gap-1"
              onClick={() => { navigator.clipboard.writeText(image.url); toast.success("URL copied"); }}
            >
              <CopyIcon className="h-2.5 w-2.5" />
              URL
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] gap-1"
              onClick={() => setPromptOpen((v) => !v)}
            >
              Prompt
            </Button>
            {image.chat_id && (
              <Link href={`/chat/${image.chat_id}`}>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1">
                  <MessageSquareIcon className="h-2.5 w-2.5" />
                  Chat
                </Button>
              </Link>
            )}
          </div>

          {promptOpen && (
            <div className="rounded-md bg-muted/60 border px-2.5 py-2">
              <p className="text-[10px] font-mono leading-relaxed text-foreground/80">{image.prompt}</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setFullscreen(false)}
          >
            <XIcon className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.prompt}
            className="max-h-full max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default function GalleryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string | null; email: string; isAdmin: boolean } | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterRatio, setFilterRatio] = useState<string | null>(null);
  const [filterModel, setFilterModel] = useState<string | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckCreating, setDeckCreating] = useState(false);
  const [createdDeckUrl, setCreatedDeckUrl] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => {});

    fetch("/api/images")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.images)) setImages(d.images); })
      .catch(() => toast.error("Failed to load images"))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(filtered.map((img) => img.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const filtered = images.filter((img) => {
    if (filterRatio && img.aspect_ratio !== filterRatio) return false;
    if (filterModel && img.model !== filterModel) return false;
    return true;
  });

  const allRatios = [...new Set(images.map((img) => img.aspect_ratio))];
  const allModels = [...new Set(images.map((img) => img.model))];

  const handleBulkDownload = async () => {
    const toDownload = filtered.filter((img) => selectedIds.has(img.id));
    if (toDownload.length === 0) return;
    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        toDownload.map(async (img, i) => {
          const res = await fetch(img.url);
          const blob = await res.blob();
          const ext = img.url.split(".").pop()?.split("?")[0] ?? "jpg";
          zip.file(`native-ad-${i + 1}.${ext}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `native-ads-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!deckTitle.trim()) return;
    setDeckCreating(true);
    try {
      const selectedImages = filtered.filter((img) => selectedIds.has(img.id));
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: deckTitle.trim(), imageIds: selectedImages.map((img) => img.id) }),
      });
      if (!res.ok) throw new Error("Failed to create deck");
      const { token } = await res.json();
      const origin = window.location.origin;
      setCreatedDeckUrl(`${origin}/deck/${token}`);
    } catch {
      toast.error("Failed to create deck");
    } finally {
      setDeckCreating(false);
    }
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
              <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
                <GalleryHorizontalIcon className="h-3.5 w-3.5" />
                Gallery
              </Button>
              <Link href="/decks">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <LayersIcon className="h-3.5 w-3.5" />
                  Decks
                </Button>
              </Link>
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

      {/* Filters bar */}
      <div className="shrink-0 border-b px-4 py-2 flex items-center gap-2 flex-wrap bg-background/80">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <FilterIcon className="h-3 w-3" /> Filter:
        </span>
        <button
          onClick={() => setFilterRatio(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filterRatio ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
        >
          All ratios
        </button>
        {allRatios.map((r) => (
          <button
            key={r}
            onClick={() => setFilterRatio(filterRatio === r ? null : r)}
            className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${filterRatio === r ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
          >
            {r}
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => setFilterModel(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filterModel ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
        >
          All models
        </button>
        {allModels.map((m) => (
          <button
            key={m}
            onClick={() => setFilterModel(filterModel === m ? null : m)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterModel === m ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
          >
            {MODEL_LABELS[m] ?? m}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{filtered.length} image{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-muted-foreground">Loading gallery…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">No images yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {images.length > 0 ? "No images match the current filter" : "Generate your first native ad in the chat"}
              </p>
            </div>
            {images.length === 0 && (
              <Link href="/chat">
                <Button size="sm" className="gap-1.5 text-xs">Go to chat</Button>
              </Link>
            )}
          </div>
        ) : (
          /* Masonry grid using CSS columns */
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3 pb-24">
            {filtered.map((image) => (
              <div key={image.id} className="break-inside-avoid mb-3">
                <GalleryCard
                  image={image}
                  selected={selectedIds.has(image.id)}
                  onToggleSelect={() => toggleSelect(image.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection footer */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="text-xs text-primary hover:underline">Select all ({filtered.length})</button>
            <button onClick={clearSelection} className="text-xs text-muted-foreground hover:underline">Clear</button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={bulkDownloading}
              onClick={handleBulkDownload}
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              {bulkDownloading ? "Downloading…" : `Download ${selectedIds.size}`}
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => { setDeckTitle(""); setCreatedDeckUrl(null); setDeckDialogOpen(true); }}
            >
              <LayersIcon className="h-3.5 w-3.5" />
              Create deck
            </Button>
          </div>
        </div>
      )}

      {/* Create Deck Dialog */}
      <Dialog open={deckDialogOpen} onOpenChange={setDeckDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayersIcon className="h-4 w-4" />
              Create Shareable Deck
            </DialogTitle>
          </DialogHeader>
          {createdDeckUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Deck created! Share this link:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs font-mono bg-muted rounded px-3 py-2 truncate">{createdDeckUrl}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 gap-1.5 text-xs"
                  onClick={() => { navigator.clipboard.writeText(createdDeckUrl); toast.success("Link copied!"); }}
                >
                  <CopyIcon className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeckDialogOpen(false)}>Done</Button>
                <Button size="sm" onClick={() => router.push(createdDeckUrl.replace(window.location.origin, ""))}>
                  View deck
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Deck title</Label>
                <Input
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="e.g. Q1 Collagen Campaign"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter" && deckTitle.trim()) handleCreateDeck(); }}
                />
                <p className="text-xs text-muted-foreground">{selectedIds.size} image{selectedIds.size !== 1 ? "s" : ""} will be included.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeckDialogOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={deckCreating || !deckTitle.trim()}
                  onClick={handleCreateDeck}
                >
                  {deckCreating ? "Creating…" : "Create & get link"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
