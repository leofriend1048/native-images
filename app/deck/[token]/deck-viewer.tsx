"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { GeneratedImage } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";

const MODEL_LABELS: Record<string, string> = {
  "google/nano-banana-pro": "Nano Banana Pro",
  "google/nano-banana-2": "Nano Banana 2",
  "bytedance/seedream-4.5": "Seedream 4.5",
  "ideogram-ai/ideogram-v3-turbo": "Ideogram v3",
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  index,
  onClose,
}: {
  images: GeneratedImage[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const [imgLoaded, setImgLoaded] = useState(false);
  const lightboxImgRef = useRef<HTMLImageElement>(null);
  const image = images[current];

  const prev = useCallback(() => {
    setImgLoaded(false);
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setImgLoaded(false);
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Reset loaded state when image changes; check immediately if already cached
  useEffect(() => {
    setImgLoaded(false);
    // Small tick to let React set the new src before checking .complete
    const t = setTimeout(() => {
      if (lightboxImgRef.current?.complete) setImgLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-white/60 font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Previous"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {!imgLoaded && (
          <Skeleton className="absolute inset-0 rounded-xl" style={{ minWidth: 300, minHeight: 300 }} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={lightboxImgRef}
          key={image.id}
          src={image.url}
          alt={image.prompt}
          onLoad={() => setImgLoaded(true)}
          className={`max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />

        {/* Caption */}
        {imgLoaded && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white">
                {image.aspect_ratio}
              </span>
              <span className="text-[10px] text-white/60">
                {MODEL_LABELS[image.model] ?? image.model}
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed line-clamp-3">{image.prompt}</p>
            <a
              href={image.url}
              download={`native-ad-${image.id}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] text-white/60 hover:text-white transition-colors"
            >
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </a>
          </div>
        )}
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Next"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/30 hidden sm:block">
        ← → to navigate · Esc to close
      </div>
    </div>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

function DeckImageCard({
  image,
  index,
  onOpen,
}: {
  image: GeneratedImage;
  index: number;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached images never fire onLoad after mount — check immediately
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div className="break-inside-avoid mb-3 sm:mb-4">
      <div
        className="group rounded-2xl overflow-hidden border bg-muted cursor-zoom-in hover:border-foreground/30 transition-all duration-200 hover:shadow-md"
        onClick={onOpen}
      >
        {/* Image */}
        <div className="relative">
          {!loaded && <Skeleton className="w-full rounded-none" style={{ paddingBottom: "75%" }} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={image.url}
            alt={image.prompt}
            loading={index < 8 ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            className={`w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          />
          {/* Hover overlay */}
          {loaded && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 backdrop-blur-sm rounded-full p-2">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  <path d="M11 8v6M8 11h6"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono bg-muted-foreground/10 px-1.5 py-0.5 rounded">
              {image.aspect_ratio}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {MODEL_LABELS[image.model] ?? image.model}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {image.prompt}
          </p>
          <a
            href={image.url}
            download={`native-ad-${image.id}.jpg`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
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

// ─── Copy link button ─────────────────────────────────────────────────────────

export function CopyLinkButton({ deckUrl }: { deckUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(deckUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyLink}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export function DeckViewer({ images }: { images: GeneratedImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {/* Image grid */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
        {images.map((image, i) => (
          <DeckImageCard
            key={image.id}
            image={image}
            index={i}
            onOpen={() => setLightboxIndex(i)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
