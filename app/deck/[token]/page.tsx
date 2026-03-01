import { notFound } from "next/navigation";
import { getDeckByToken, getGeneratedImagesByIds } from "@/lib/db";
import type { GeneratedImage } from "@/lib/db";
import { DeckViewer, CopyLinkButton } from "./deck-viewer";
import { headers } from "next/headers";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const deck = await getDeckByToken(token);
  if (!deck || deck.active === 0) notFound();

  const imageIds: string[] = JSON.parse(deck.image_ids || "[]");
  const images = await getGeneratedImagesByIds(imageIds);
  const ordered = imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is GeneratedImage => !!img)
    .map((img) => ({
      id: img.id,
      user_id: img.user_id,
      chat_id: img.chat_id,
      url: img.url,
      prompt: img.prompt,
      model: img.model,
      aspect_ratio: img.aspect_ratio,
      created_at: img.created_at,
    }));

  const createdDate = new Date(deck.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build the canonical URL from the request host
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "nativeads.ai";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const deckUrl = `${proto}://${host}/deck/${token}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground">
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-background"
              >
                <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">Native Ads</span>
          </div>

          {/* Meta + copy link */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-muted-foreground">
              Creative deck · {createdDate}
            </span>
            <CopyLinkButton deckUrl={deckUrl} />
          </div>
        </div>
      </header>

      {/* Hero section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-2">
          Creative Deck
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{deck.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {ordered.length} image{ordered.length !== 1 ? "s" : ""} · Click any image to expand
        </p>
      </div>

      {/* Image grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {ordered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <svg className="h-10 w-10 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <p className="text-sm">This deck has no images.</p>
          </div>
        ) : (
          <DeckViewer images={ordered} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Created with{" "}
            <strong className="text-foreground font-semibold">Native Ad AI</strong>{" "}
            — AI-powered native ad creative studio
          </p>
          <p className="text-xs text-muted-foreground">{createdDate}</p>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const deck = await getDeckByToken(token);
  if (!deck) return { title: "Deck not found" };
  const count = JSON.parse(deck.image_ids || "[]").length;
  return {
    title: `${deck.title} — Native Ad Creative Deck`,
    description: `${count} AI-generated native ad image${count !== 1 ? "s" : ""}, crafted with Native Ad AI`,
  };
}
