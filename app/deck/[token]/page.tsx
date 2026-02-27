import { notFound } from "next/navigation";
import { getDeckByToken, getGeneratedImagesByIds } from "@/lib/db";
import type { GeneratedImage } from "@/lib/db";

const MODEL_LABELS: Record<string, string> = {
  "google/nano-banana-pro": "Nano Banana Pro",
  "google/nano-banana-2": "Nano Banana 2",
  "bytedance/seedream-4.5": "Seedream 4.5",
  "ideogram-ai/ideogram-v3-turbo": "Ideogram v3",
};

export default async function DeckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const deck = await getDeckByToken(token);
  if (!deck) notFound();

  const imageIds: string[] = JSON.parse(deck.image_ids || "[]");
  const images = await getGeneratedImagesByIds(imageIds);
  const ordered = imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is GeneratedImage => !!img);

  const createdDate = new Date(deck.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
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
          <span className="text-xs text-muted-foreground">Creative deck · {createdDate}</span>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{deck.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ordered.length} image{ordered.length !== 1 ? "s" : ""} · Generated with Native Ad AI
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
          {ordered.map((image, i) => (
            <DeckImageCard key={image.id} image={image} index={i} />
          ))}
        </div>

        {ordered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">This deck has no images.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Created with <strong className="text-foreground">Native Ad AI</strong>
          </p>
          <p className="text-xs text-muted-foreground">{createdDate}</p>
        </div>
      </footer>
    </div>
  );
}

function DeckImageCard({ image, index }: { image: GeneratedImage; index: number }) {
  return (
    <div className="break-inside-avoid mb-4">
      <div className="group rounded-xl overflow-hidden border bg-muted hover:border-foreground/20 transition-colors">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full object-cover"
          loading={index < 8 ? "eager" : "lazy"}
        />
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono bg-muted-foreground/10 px-1.5 py-0.5 rounded">
              {image.aspect_ratio}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {MODEL_LABELS[image.model] ?? image.model}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
            {image.prompt}
          </p>
          <a
            href={image.url}
            download={`native-ad-${image.id}.jpg`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </a>
        </div>
      </div>
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
  return {
    title: `${deck.title} — Native Ad Creative Deck`,
    description: `${JSON.parse(deck.image_ids || "[]").length} AI-generated native ad images`,
  };
}
