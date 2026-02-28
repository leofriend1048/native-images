"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRightIcon,
  SparklesIcon,
  LayersIcon,
  ClipboardListIcon,
  CheckIcon,
} from "lucide-react";

const STORAGE_KEY = "native-ads-onboarding-v2";

// ─── Illustrations ────────────────────────────────────────────────────────────

function WelcomeIllustration() {
  const cards = [
    { h: 112, tilt: "-rotate-6", gradient: "from-rose-400/50 to-orange-300/40", delay: "" },
    { h: 140, tilt: "",           gradient: "from-violet-400/50 to-pink-300/40",  delay: "" },
    { h: 100, tilt: "rotate-6",  gradient: "from-blue-400/50 to-cyan-300/40",    delay: "" },
  ];
  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Floating image cards */}
      <div className="flex items-end gap-3 relative z-10">
        {cards.map((c, i) => (
          <div
            key={i}
            className={`w-[88px] rounded-2xl bg-gradient-to-br ${c.gradient} border border-white/30 shadow-2xl ${c.tilt} flex flex-col justify-end p-2.5 backdrop-blur-sm`}
            style={{ height: c.h }}
          >
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/70" />
              <div className="h-1.5 flex-1 rounded-full bg-white/40" />
            </div>
          </div>
        ))}
      </div>
      {/* Step pills */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
        {["Ideate", "Generate", "Share"].map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-1.5 text-[10px] font-semibold bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full border shadow-sm"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-foreground text-background text-[8px] flex items-center justify-center font-bold shrink-0">
              {i + 1}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptIllustration() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
      {/* Prompt input mockup */}
      <div className="w-full rounded-2xl border-2 border-foreground/10 bg-background/70 backdrop-blur-sm shadow-lg px-4 py-3">
        <p className="text-sm text-foreground/90 font-mono leading-relaxed">
          cracked heels on tile floor, close-up
          <span className="inline-block w-0.5 h-4 bg-foreground/80 ml-0.5 animate-pulse align-middle" />
        </p>
      </div>
      {/* Concept type pills */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {[
          { label: "Close-up / Body",  cls: "bg-rose-500/10  text-rose-600  border-rose-300/40" },
          { label: "Before / After",   cls: "bg-blue-500/10  text-blue-600  border-blue-300/40" },
          { label: "Problem moment",   cls: "bg-amber-500/10 text-amber-600 border-amber-300/40" },
          { label: "Lifestyle",        cls: "bg-green-500/10 text-green-600 border-green-300/40" },
        ].map((p) => (
          <div key={p.label} className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${p.cls}`}>
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeationIllustration() {
  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-2">
        {/* User concept */}
        <div className="flex justify-end">
          <div className="bg-foreground/10 rounded-2xl rounded-br-sm px-3 py-2 text-[11px] max-w-[70%]">
            cracked heels on tile floor…
          </div>
        </div>
        {/* AI clarification */}
        <div className="bg-background/70 backdrop-blur-sm rounded-2xl rounded-bl-sm border shadow-sm px-3 py-2.5">
          <p className="text-[11px] font-semibold mb-1.5">What product is this for?</p>
          <div className="space-y-1">
            <div className="text-[10px] px-2.5 py-1.5 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 font-medium text-emerald-700 flex items-center gap-1.5">
              <CheckIcon className="h-2.5 w-2.5" /> Foot cream / balm
            </div>
            <div className="text-[10px] px-2.5 py-1.5 rounded-lg border bg-background text-muted-foreground">Exfoliating scrub</div>
          </div>
        </div>
        {/* Enhanced prompt */}
        <div className="bg-background/70 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <SparklesIcon className="h-2.5 w-2.5 text-emerald-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600">Enhanced prompt</span>
          </div>
          <p className="text-[10px] font-mono text-foreground/70 leading-relaxed line-clamp-2">
            Close-up of severely cracked dry heels on white bathroom tile, painful neglected before-state…
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsIllustration() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
      {/* Settings toolbar */}
      <div className="w-full bg-background/70 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-md border overflow-hidden text-[11px]">
          {["1x", "2x", "4x"].map((v, i) => (
            <div key={v} className={`px-2.5 py-1 font-medium ${i === 1 ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}>{v}</div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] border rounded-md px-2.5 py-1 bg-background">
          <div className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
          <span className="font-medium">Nano Banana 2</span>
          <svg className="w-2.5 h-2.5 text-muted-foreground" viewBox="0 0 10 10"><path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
        </div>
        <div className="flex items-center gap-1 text-[11px] border rounded-md px-2.5 py-1 bg-background">
          <span>4:5</span>
          <svg className="w-2.5 h-2.5 text-muted-foreground" viewBox="0 0 10 10"><path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-md border border-dashed bg-background/40">
          <ClipboardListIcon className="h-3 w-3" /> Brief
        </div>
      </div>
      {/* Brief panel preview */}
      <div className="w-full bg-background/60 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <ClipboardListIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Creative Brief</span>
          <div className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-foreground text-background font-semibold">
            8 concepts
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {["Product", "Audience", "Key benefit", "Emotion"].map((f) => (
            <div key={f} className="h-5 rounded border bg-background flex items-center px-2">
              <span className="text-[9px] text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryIllustration() {
  const tiles = [
    { h: 76,  selected: false, gradient: "from-rose-300/40 to-orange-200/30" },
    { h: 96,  selected: true,  gradient: "from-violet-300/40 to-pink-200/30" },
    { h: 68,  selected: false, gradient: "from-blue-300/40 to-cyan-200/30" },
    { h: 84,  selected: true,  gradient: "from-amber-300/40 to-yellow-200/30" },
    { h: 92,  selected: false, gradient: "from-emerald-300/40 to-teal-200/30" },
    { h: 72,  selected: false, gradient: "from-sky-300/40 to-indigo-200/30" },
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
      <div className="w-full max-w-sm">
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {tiles.map((t, i) => (
            <div
              key={i}
              className={`relative rounded-xl bg-gradient-to-br ${t.gradient} border overflow-hidden`}
              style={{ height: t.h }}
            >
              {t.selected && (
                <>
                  <div className="absolute inset-0 bg-foreground/10 rounded-xl" />
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-foreground flex items-center justify-center shadow">
                    <CheckIcon className="h-3 w-3 text-background" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">2 selected</span>
          <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-foreground text-background font-semibold shadow-sm">
            <LayersIcon className="h-3 w-3" /> Create deck
          </div>
        </div>
        <div className="mt-1.5 rounded-lg border bg-background/60 px-2.5 py-1.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            nativeads.app/deck/79lThCX_…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    gradient: "from-violet-500/15 via-purple-500/10 to-transparent",
    illustration: <WelcomeIllustration />,
    badge: null,
    title: "Generate scroll-stopping native ads",
    body: "AI that thinks like a creative director. Describe a visual concept and get a hyperrealistic, iPhone-style image ready to run.",
    tip: null,
  },
  {
    gradient: "from-blue-500/15 via-indigo-500/10 to-transparent",
    illustration: <ConceptIllustration />,
    badge: "Step 1",
    title: "Type a raw, visceral visual moment",
    body: "Be specific about the body part, emotion, or problem. \"Cracked heels on tile\" beats \"foot care ad\" every time.",
    tip: "Think: what would make someone stop scrolling mid-feed and feel something?",
  },
  {
    gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
    illustration: <IdeationIllustration />,
    badge: "Step 2",
    title: "AI asks 1–2 questions, then writes the prompt",
    body: "It nails your product, audience, and angle — then generates multiple variations. Pick one, queue several, or skip straight to generate.",
    tip: null,
  },
  {
    gradient: "from-amber-500/15 via-orange-500/10 to-transparent",
    illustration: <SettingsIllustration />,
    badge: "Step 3",
    title: "Control format, model, and volume",
    body: "Set aspect ratio for any placement, batch 1–4 images per run, and swap models mid-session. Use Brief mode to queue up to 8 concepts from one form.",
    tip: null,
  },
  {
    gradient: "from-sky-500/15 via-blue-500/10 to-transparent",
    illustration: <GalleryIllustration />,
    badge: "Step 4",
    title: "Every image saved. Shareable with one click.",
    body: "Your Gallery stores everything automatically. Select images, create a deck, and send clients a share link — no login required on their end.",
    tip: null,
  },
] as const;

const STARTER_CONCEPTS: { label: string; category: string; color: string }[] = [
  { label: "Dry, cracked heels on bathroom tile, close-up",         category: "Body / Pain",    color: "border-rose-200/60   hover:border-rose-400/60"   },
  { label: "Before/after bloated vs. flat stomach, side by side",   category: "Before / After", color: "border-blue-200/60   hover:border-blue-400/60"   },
  { label: "Irritated red razor burn on jawline, morning light",    category: "Close-up / Skin",color: "border-orange-200/60 hover:border-orange-400/60" },
  { label: "Puffy under-eye bags, unflattering morning selfie",     category: "Portrait",       color: "border-violet-200/60 hover:border-violet-400/60" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingModal({
  open,
  onOpenChange,
  onSelectConcept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConcept?: (concept: string) => void;
}) {
  const [step, setStep] = useState(0);
  const totalContent = STEPS.length;
  const isFinal = step === totalContent; // final "pick a concept" screen

  const handleNext = () => {
    if (isFinal) { onOpenChange(false); return; }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));
  const handleClose = () => onOpenChange(false);

  const handlePickConcept = (concept: string) => {
    onOpenChange(false);
    onSelectConcept?.(concept);
  };

  useEffect(() => { if (open) setStep(0); }, [open]);

  // Keyboard ← → navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft" && step > 0) handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = !isFinal ? STEPS[step] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px] p-0 overflow-hidden gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {current ? current.title : "You're ready to go"}
        </DialogTitle>

        {/* ── Content step ─────────────────────────────────────────────── */}
        {!isFinal && current && (
          <div className="flex flex-col" key={step}>
            {/* Illustration */}
            <div className={`h-[220px] shrink-0 bg-gradient-to-b ${current.gradient} relative`}>
              {current.illustration}
            </div>

            {/* Content */}
            <div className="px-7 pt-5 pb-4">
              {current.badge && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {current.badge} <span className="opacity-40">/ {totalContent}</span>
                </span>
              )}
              {!current.badge && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 opacity-0 select-none">
                  &nbsp;
                </span>
              )}
              <h2 className="text-[18px] font-bold tracking-tight leading-snug">
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {current.body}
              </p>
              {current.tip && (
                <div className="mt-3 rounded-lg bg-muted border px-3 py-2.5 flex gap-2">
                  <SparklesIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {current.tip}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="shrink-0 flex items-center justify-between px-7 py-4 border-t bg-background">
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBack}>
                    ← Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={handleClose}
                >
                  Skip
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
                {Array.from({ length: totalContent + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === step
                        ? "w-4 h-1.5 bg-foreground"
                        : "w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40"
                    }`}
                  />
                ))}
              </div>

              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleNext}>
                {step === totalContent - 1 ? "Get started" : "Next"}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Final step: pick a concept ────────────────────────────────── */}
        {isFinal && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-7 pt-7 pb-1">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Ready to go
              </span>
              <h2 className="text-[18px] font-bold tracking-tight">Try one of these to start</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Click a concept and the AI will ideate it for you — or type your own below.
              </p>
            </div>

            {/* Concept cards */}
            <div className="px-7 py-4 grid grid-cols-2 gap-2">
              {STARTER_CONCEPTS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => handlePickConcept(c.label)}
                  className={`group text-left rounded-xl border-2 ${c.color} bg-background p-3 transition-all duration-150 hover:shadow-sm hover:-translate-y-px active:translate-y-0`}
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {c.category}
                  </span>
                  <span className="block text-[12px] leading-snug text-foreground/85 group-hover:text-foreground transition-colors">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="shrink-0 flex items-center justify-between px-7 py-4 border-t bg-background">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBack}>
                  ← Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={handleClose}
                >
                  Dismiss
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
                {Array.from({ length: totalContent + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === step
                        ? "w-4 h-1.5 bg-foreground"
                        : "w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40"
                    }`}
                  />
                ))}
              </div>

              <Button size="sm" className="h-8 text-xs" onClick={handleClose}>
                Start typing ↵
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboarding() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) setOpen(true);
    setReady(true);
  }, []);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) localStorage.setItem(STORAGE_KEY, "1");
  };

  return { open, setOpen: handleOpenChange, ready };
}
