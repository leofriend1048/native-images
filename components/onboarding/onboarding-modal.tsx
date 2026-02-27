"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SparklesIcon,
  ImageIcon,
  SlidersHorizontalIcon,
  ClipboardListIcon,
  GalleryHorizontalIcon,
  ArrowRightIcon,
  CheckIcon,
  LayersIcon,
  RepeatIcon,
} from "lucide-react";

const STORAGE_KEY = "native-ads-onboarding-v1";

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: ImageIcon,
    accent: "bg-violet-500",
    title: "Welcome to Native Ad AI",
    subtitle: "Generate scroll-stopping, UGC-style ad images in minutes — powered by AI that thinks like a creative director.",
    visual: <WelcomeVisual />,
    tip: null,
  },
  {
    icon: SparklesIcon,
    accent: "bg-blue-500",
    title: "Start with a visual concept",
    subtitle: "Type a raw, specific moment — a body part, a before/after, a problem someone feels. The more visceral, the better.",
    visual: <ConceptVisual />,
    tip: "\"cracked heels\" is better than \"foot care ad\". Think about what would make someone stop scrolling.",
  },
  {
    icon: RepeatIcon,
    accent: "bg-emerald-500",
    title: "The AI ideates before generating",
    subtitle: "It asks 1–2 quick questions to nail down your product, audience, and angle. Then it writes a full native-ad prompt and shows variations.",
    visual: <IdeationVisual />,
    tip: "Pick any variation to generate, or add multiple to the queue to run them back-to-back.",
  },
  {
    icon: SlidersHorizontalIcon,
    accent: "bg-amber-500",
    title: "Control your output",
    subtitle: "The settings bar lets you tune everything before hitting generate.",
    visual: <SettingsVisual />,
    tip: null,
  },
  {
    icon: ClipboardListIcon,
    accent: "bg-pink-500",
    title: "Brief mode for full campaigns",
    subtitle: "Have a product, audience, and benefit ready? Use the Brief button to generate and auto-queue up to 8 concepts at once.",
    visual: <BriefVisual />,
    tip: "Great for new campaigns — fill it in once and let the queue run.",
  },
  {
    icon: GalleryHorizontalIcon,
    accent: "bg-sky-500",
    title: "Your gallery & sharing",
    subtitle: "Every image is saved automatically to your Gallery. Select images and create a shareable deck link for clients.",
    visual: <GalleryVisual />,
    tip: "Shareable decks need no login — just send the link.",
  },
  {
    icon: CheckIcon,
    accent: "bg-green-500",
    title: "You're ready to go",
    subtitle: "Here are a few concepts to try. Click one and we'll get started.",
    visual: null,
    tip: null,
  },
] as const;

const STARTER_CONCEPTS = [
  "Dry, cracked heels on a bathroom floor tile, close-up",
  "Before/after bloated vs flat stomach, side-by-side comparison",
  "Irritated red razor burn on jawline, close-up morning light",
  "Puffy under-eye bags, close-up, unflattering morning selfie",
  "Thinning hair visible from overhead, dramatic lighting",
];

// ─── Step visuals ─────────────────────────────────────────────────────────────

function WelcomeVisual() {
  return (
    <div className="flex items-center justify-center gap-5 h-full">
      <div className="w-24 h-32 rounded-xl bg-muted border flex items-center justify-center shadow-sm">
        <div className="space-y-1.5 px-3 py-3 w-full">
          <div className="h-2 bg-muted-foreground/20 rounded-full w-full" />
          <div className="h-2 bg-muted-foreground/20 rounded-full w-4/5" />
          <div className="h-12 bg-muted-foreground/10 rounded-lg mt-2 border" />
          <div className="h-2 bg-muted-foreground/20 rounded-full w-3/5 mt-1" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {["Ideate", "Generate", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${["bg-violet-500", "bg-blue-500", "bg-green-500"][i]}`}>{i + 1}</div>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptVisual() {
  const examples = [
    "cracked heels on tile floor",
    "bloated stomach side-by-side",
    "red razor burn on jawline",
  ];
  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      <div className="rounded-xl border bg-background px-3 py-2.5 text-sm text-muted-foreground">
        Describe your ad concept…
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {examples.map((ex) => (
          <div key={ex} className="text-[11px] px-2.5 py-1 rounded-full border bg-muted font-medium">
            {ex}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
        Think: what would make someone stop scrolling mid-feed?
      </p>
    </div>
  );
}

function IdeationVisual() {
  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      {/* Clarification question */}
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <p className="text-[11px] font-medium">What product is this for?</p>
        <div className="flex flex-col gap-1">
          {["Foot cream / balm", "Exfoliating scrub", "Other"].map((opt, i) => (
            <div key={opt} className={`text-[10px] px-2.5 py-1.5 rounded-lg border ${i === 0 ? "border-primary bg-primary/5 font-medium" : "bg-background"}`}>{opt}</div>
          ))}
        </div>
      </div>
      {/* Enhanced prompt */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <SparklesIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Enhanced prompt</span>
        </div>
        <p className="text-[10px] font-mono leading-relaxed text-foreground/70">Close-up of severely cracked dry heels on white bathroom tile [painful, neglected, before-state]…</p>
      </div>
    </div>
  );
}

function SettingsVisual() {
  const settings = [
    { label: "Batch", options: ["1x", "2x", "4x"], active: 1 },
    { label: "Format", options: ["4:5", "1:1", "9:16"], active: 0 },
    { label: "Model", options: ["NB2", "NB Pro", "Ideogram"], active: 0 },
  ];
  return (
    <div className="flex flex-col gap-3 h-full justify-center">
      {settings.map(({ label, options, active }) => (
        <div key={label} className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-1">
            {options.map((opt, i) => (
              <div key={opt} className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${i === active ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground"}`}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="text-[10px] text-muted-foreground leading-relaxed mt-1">
        Select multiple formats to generate all crops automatically in one run.
      </div>
    </div>
  );
}

function BriefVisual() {
  const fields = ["Product", "Audience", "Key benefit", "Emotion", "Concepts: 4"];
  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <ClipboardListIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Creative Brief</span>
        </div>
        {fields.map((f) => (
          <div key={f} className="h-6 rounded border bg-background px-2 flex items-center">
            <span className="text-[10px] text-muted-foreground">{f}</span>
          </div>
        ))}
        <div className="mt-1 h-7 rounded-lg bg-foreground flex items-center justify-center">
          <span className="text-[10px] font-semibold text-background flex items-center gap-1">
            <SparklesIcon className="h-2.5 w-2.5" /> Generate 4 concepts
          </span>
        </div>
      </div>
    </div>
  );
}

function GalleryVisual() {
  const colors = ["bg-muted-foreground/15", "bg-muted-foreground/10", "bg-muted-foreground/20", "bg-muted-foreground/12"];
  return (
    <div className="flex flex-col gap-3 h-full justify-center">
      <div className="grid grid-cols-3 gap-1.5">
        {[32, 40, 28, 36, 44, 30].map((h, i) => (
          <div key={i} className={`${colors[i % colors.length]} rounded-lg border`} style={{ height: h }} />
        ))}
      </div>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
            <CheckIcon className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">3 selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-[10px] px-2 py-0.5 rounded bg-foreground text-background font-medium flex items-center gap-1">
            <LayersIcon className="h-2.5 w-2.5" /> Create deck
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      onOpenChange(false);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSelectConcept = (concept: string) => {
    onOpenChange(false);
    onSelectConcept?.(concept);
  };

  // Reset to step 0 when re-opened
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const IconComponent = current.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{current.title}</DialogTitle>

        <div className="flex flex-col sm:flex-row h-auto sm:h-[480px]">
          {/* Left panel — illustration */}
          <div className={`shrink-0 sm:w-56 p-6 flex flex-col justify-between ${current.accent} bg-opacity-10`}
            style={{ background: `color-mix(in srgb, var(--background) 92%, currentColor)` }}
          >
            <div className="space-y-3">
              <div className={`w-9 h-9 rounded-xl ${current.accent} flex items-center justify-center`}>
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              {current.visual ? (
                <div className="h-44 sm:h-auto sm:flex-1">
                  {current.visual}
                </div>
              ) : null}
            </div>
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-4">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === step ? "w-4 h-1.5 bg-foreground" : "w-1.5 h-1.5 bg-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right panel — content */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {step + 1} / {STEPS.length}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight leading-snug">{current.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.subtitle}</p>

              {current.tip && (
                <div className="mt-4 rounded-lg bg-muted border px-3 py-2.5">
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Tip: </span>
                    {current.tip}
                  </p>
                </div>
              )}

              {/* Last step: starter concepts */}
              {isLast && (
                <div className="mt-4 space-y-2">
                  {STARTER_CONCEPTS.map((concept) => (
                    <button
                      key={concept}
                      onClick={() => handleSelectConcept(concept)}
                      className="w-full text-left text-sm px-3 py-2.5 rounded-lg border bg-background hover:bg-accent hover:border-accent transition-colors leading-snug flex items-center justify-between group"
                    >
                      <span>{concept}</span>
                      <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation — pinned outside the scroll area */}
            <div className="shrink-0 flex items-center justify-between px-6 sm:px-8 py-4 border-t bg-background">
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBack}>
                    Back
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={handleClose}>
                  {isLast ? "Skip concepts" : "Skip tour"}
                </Button>
              </div>
              {!isLast && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleNext}>
                  Next
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
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
    if (!completed) {
      setOpen(true);
    }
    setReady(true);
  }, []);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  return { open, setOpen: handleOpenChange, ready };
}
