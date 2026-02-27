"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SparklesIcon, MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Emotion options ───────────────────────────────────────────────────────────

const EMOTIONS = [
  { id: "pain",         label: "Pain" },
  { id: "relief",       label: "Relief" },
  { id: "curiosity",    label: "Curiosity" },
  { id: "social_proof", label: "Social proof" },
] as const;

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-foreground/40">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CreativeBriefDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: string;
  onProductChange: (v: string) => void;
  audience: string;
  onAudienceChange: (v: string) => void;
  benefit: string;
  onBenefitChange: (v: string) => void;
  emotion: string;
  onEmotionChange: (v: string) => void;
  conceptCount: number;
  onConceptCountChange: (v: number) => void;
  loading: boolean;
  onSubmit: () => void;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreativeBriefDialog({
  open,
  onOpenChange,
  product,
  onProductChange,
  audience,
  onAudienceChange,
  benefit,
  onBenefitChange,
  emotion,
  onEmotionChange,
  conceptCount,
  onConceptCountChange,
  loading,
  onSubmit,
  disabled,
}: CreativeBriefDialogProps) {
  const canSubmit = product.trim() && audience.trim() && benefit.trim() && !loading && !disabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border-border/50 shadow-xl">
        <VisuallyHidden><DialogTitle>Creative Brief</DialogTitle></VisuallyHidden>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40">
          <h2 className="text-sm font-semibold">Creative Brief</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Describe what you&apos;re selling and who you&apos;re selling to.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          <Field label="Product or service" required>
            <Input
              value={product}
              onChange={(e) => onProductChange(e.target.value)}
              placeholder="e.g. Daily collagen powder"
              className="h-8 text-sm"
              autoFocus
            />
          </Field>

          <Field label="Target audience" required>
            <Textarea
              value={audience}
              onChange={(e) => onAudienceChange(e.target.value)}
              placeholder="e.g. Women 30–50 with joint pain and an active lifestyle"
              className="min-h-[60px] resize-none text-sm"
            />
          </Field>

          <Field label="Core benefit / USP" required>
            <Textarea
              value={benefit}
              onChange={(e) => onBenefitChange(e.target.value)}
              placeholder="e.g. Reduces stiffness within 2 weeks, no pills"
              className="min-h-[60px] resize-none text-sm"
            />
          </Field>

          <Field label="Desired emotion">
            <div className="flex gap-1.5 flex-wrap">
              {EMOTIONS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEmotionChange(e.id)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                    emotion === e.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Number of concepts">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => onConceptCountChange(Math.max(1, conceptCount - 1))}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">{conceptCount}</span>
                <button
                  onClick={() => onConceptCountChange(Math.min(8, conceptCount + 1))}
                  className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                concept{conceptCount !== 1 ? "s" : ""} will be queued
              </span>
            </div>
          </Field>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/40 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="text-xs h-7 px-3 gap-1.5"
          >
            <SparklesIcon className="h-3 w-3" />
            {loading ? "Generating…" : `Generate ${conceptCount} concept${conceptCount !== 1 ? "s" : ""}`}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
