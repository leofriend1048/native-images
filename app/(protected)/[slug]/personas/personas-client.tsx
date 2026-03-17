"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  PlusIcon,
  TrashIcon,
  Loader2,
  ChevronLeftIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  SearchIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PersonaResearchReport } from "@/components/persona-research-report";

interface Persona {
  id: string;
  name: string;
  description: string;
  research: string | null;
  research_status: string;
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

function getSectionCount(research: string | null): number {
  if (!research) return 0;
  try {
    const data = JSON.parse(research);
    return Object.keys(data).filter((k) => data[k] && typeof data[k] === "object").length;
  } catch {
    return 0;
  }
}

export default function PersonasClient({ initialPersonas }: { initialPersonas: Persona[] }) {
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [product, setProduct] = useState("");
  const [saving, setSaving] = useState(false);

  const viewingPersona = personas.find((p) => p.id === viewingId) ?? null;

  const triggerResearch = useCallback(async (personaId: string, productName?: string) => {
    setPersonas((prev) => prev.map((p) => p.id === personaId ? { ...p, research_status: "researching" } : p));
    try {
      const res = await fetch(`/api/personas/${personaId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productName || "" }),
      });
      if (res.ok) {
        const { research } = await res.json();
        setPersonas((prev) => prev.map((p) => p.id === personaId ? { ...p, research, research_status: "complete" } : p));
        toast.success("Research complete");
      } else {
        setPersonas((prev) => prev.map((p) => p.id === personaId ? { ...p, research_status: "failed" } : p));
        toast.error("Research failed");
      }
    } catch {
      setPersonas((prev) => prev.map((p) => p.id === personaId ? { ...p, research_status: "failed" } : p));
      toast.error("Research failed");
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (res.ok) {
        const { persona } = await res.json();
        setPersonas((prev) => [{ ...persona, research: null, research_status: "none" }, ...prev]);
        const prod = product.trim();
        setName("");
        setDescription("");
        setProduct("");
        setCreateOpen(false);
        toast.success("Persona created — starting research...");
        triggerResearch(persona.id, prod);
      }
    } catch {
      toast.error("Failed to create persona");
    } finally {
      setSaving(false);
    }
  }, [name, description, product, triggerResearch]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/personas/${id}`, { method: "DELETE" });
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    if (viewingId === id) setViewingId(null);
    setDeleteId(null);
    toast.success("Persona deleted");
  }, [viewingId]);

  // ── Detail view ────────────────────────────────────────────────────────────
  if (viewingPersona) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => setViewingId(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              All Personas
            </button>
            <div className="flex items-center gap-2">
              {viewingPersona.research_status === "complete" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5"
                  onClick={() => triggerResearch(viewingPersona.id)}
                >
                  <RefreshCwIcon className="h-3 w-3" />
                  Regenerate
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteId(viewingPersona.id)}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6">
          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-8 pb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-foreground/[0.04] border border-border/60 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-foreground/60">
                  {viewingPersona.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">{viewingPersona.name}</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{viewingPersona.description}</p>
              </div>
            </div>

            {/* Quick stats bar */}
            {viewingPersona.research_status === "complete" && viewingPersona.research && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-6 flex items-center gap-6 text-xs text-muted-foreground"
              >
                <QuickStat label="Sections" value={`${getSectionCount(viewingPersona.research)}`} />
                <QuickStat label="Status" value="Complete" />
                <QuickStat label="Created" value={relativeTime(viewingPersona.created_at)} />
              </motion.div>
            )}
          </motion.div>

          {/* Report */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="pb-12"
          >
            <PersonaResearchReport
              research={viewingPersona.research}
              status={viewingPersona.research_status}
              onRegenerate={() => triggerResearch(viewingPersona.id)}
            />
          </motion.div>
        </div>

        <DeleteDialog id={deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Deep audience research dossiers powered by web intelligence
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <PlusIcon className="h-3.5 w-3.5" />
                New Persona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Persona</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input
                    placeholder="e.g. Acne-prone millennial mom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    placeholder="Describe who this persona is and what they care about..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Product context
                    <span className="text-muted-foreground/50 ml-1 font-normal">optional</span>
                  </label>
                  <Input
                    placeholder="e.g. Anti-aging serum, Organic dog food..."
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || !description.trim() || saving}
                  className="w-full"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <SearchIcon className="h-4 w-4 mr-1.5" />}
                  Create & Research
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards */}
        {personas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-dashed rounded-xl py-20 flex flex-col items-center justify-center text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-foreground/[0.03] border border-border/60 flex items-center justify-center mb-4">
              <SearchIcon className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/70">No personas yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Create a persona to generate a comprehensive research dossier with real consumer language
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-5 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Create your first persona
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {personas.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                >
                  <PersonaCard
                    persona={p}
                    onView={() => setViewingId(p.id)}
                    onDelete={() => setDeleteId(p.id)}
                    onRegenerate={() => triggerResearch(p.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <DeleteDialog id={deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  onView,
  onDelete,
  onRegenerate,
}: {
  persona: Persona;
  onView: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
}) {
  const isComplete = persona.research_status === "complete";
  const isResearching = persona.research_status === "researching";
  const isFailed = persona.research_status === "failed";
  const sections = getSectionCount(persona.research);

  return (
    <button
      onClick={onView}
      className="w-full text-left rounded-xl border bg-card hover:bg-accent/30 transition-all duration-200 group relative overflow-hidden"
    >
      {/* Researching shimmer */}
      {isResearching && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent" />
        </div>
      )}

      <div className="p-5 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-foreground/[0.04] border border-border/60 flex items-center justify-center shrink-0 group-hover:border-border transition-colors">
          <span className="text-base font-semibold text-foreground/50 group-hover:text-foreground/70 transition-colors">
            {persona.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-sm font-medium truncate">{persona.name}</h3>
            <StatusPill status={persona.research_status} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{persona.description}</p>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2.5 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {relativeTime(persona.created_at)}
            </span>
            {isComplete && sections > 0 && (
              <span>{sections} sections</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 self-center">
          {isFailed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2Icon className="h-3 w-3" />
          Researched
        </span>
      );
    case "researching":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Researching
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive">
          <AlertCircleIcon className="h-3 w-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/5 text-muted-foreground/60">
          Pending
        </span>
      );
  }
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground/50">{label}</span>
      <span className="text-foreground/70 font-medium">{value}</span>
    </div>
  );
}

function DeleteDialog({
  id,
  onClose,
  onConfirm,
}: {
  id: string | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <AlertDialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete persona</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the persona and all associated research. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => id && onConfirm(id)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
