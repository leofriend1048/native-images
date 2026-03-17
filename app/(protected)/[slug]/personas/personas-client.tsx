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
  GlobeIcon,
  FileTextIcon,
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

function formatDate(dateStr: string): string {
  const utc = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
  return new Date(utc).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getResearchMeta(research: string | null): { sections: number; sources: number } {
  if (!research) return { sections: 0, sources: 0 };
  try {
    const data = JSON.parse(research);
    const sections = Object.keys(data).filter((k) => !k.startsWith("_") && data[k] && typeof data[k] === "object").length;
    const sources = data._search_count ?? data._sources?.length ?? 0;
    return { sections, sources };
  } catch {
    return { sections: 0, sources: 0 };
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

  // ── Dossier detail view ────────────────────────────────────────────────────
  if (viewingPersona) {
    const meta = getResearchMeta(viewingPersona.research);

    return (
      <div className="flex-1 overflow-y-auto">
        {/* Minimal nav bar */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-3xl mx-auto px-8 h-12 flex items-center justify-between">
            <button
              onClick={() => setViewingId(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Personas
            </button>
            <div className="flex items-center gap-1">
              {viewingPersona.research_status === "complete" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5 text-muted-foreground"
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

        <div className="max-w-3xl mx-auto px-8">
          {/* Report masthead */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pt-12 pb-10"
          >
            <div className="space-y-6">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Research Dossier
                </span>
                {viewingPersona.research_status === "complete" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">
                {viewingPersona.name}
              </h1>

              {/* Description */}
              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                {viewingPersona.description}
              </p>

              {/* Meta strip */}
              {viewingPersona.research_status === "complete" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="flex items-center gap-5 pt-2"
                >
                  <MetaChip icon={<FileTextIcon className="h-3 w-3" />} value={`${meta.sections} sections`} />
                  {meta.sources > 0 && (
                    <MetaChip icon={<GlobeIcon className="h-3 w-3" />} value={`${meta.sources} sources`} />
                  )}
                  <span className="text-[11px] text-muted-foreground/40">
                    {formatDate(viewingPersona.created_at)}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Divider */}
            <div className="mt-10 h-px bg-border/60" />
          </motion.div>

          {/* Report body */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="pb-20"
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
      <div className="max-w-3xl mx-auto px-8 pt-12 pb-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 block mb-3">
                Audience Research
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">Personas</h1>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8">
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
                      <span className="text-muted-foreground/40 ml-1 font-normal">optional</span>
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
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Deep audience research dossiers built from real consumer language across the web.
          </p>
        </div>

        {/* Cards */}
        {personas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="py-24 flex flex-col items-center justify-center text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] flex items-center justify-center mb-5">
              <SearchIcon className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground/60">No personas yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1.5 max-w-xs leading-relaxed">
              Create a persona to generate a comprehensive research dossier with real consumer language
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-6 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Create your first persona
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-0 divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {personas.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <PersonaRow
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

// ─── Row ───────────────────────────────────────────────────────────────────────

function PersonaRow({
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
  const meta = getResearchMeta(persona.research);

  return (
    <button
      onClick={onView}
      className="w-full text-left py-5 group relative flex items-center gap-5 hover:bg-accent/20 -mx-3 px-3 rounded-lg transition-colors"
    >
      {/* Left: initial */}
      <div className="w-10 h-10 rounded-full bg-foreground/[0.05] flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-foreground/40 group-hover:text-foreground/60 transition-colors">
          {persona.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Center: content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-medium truncate">{persona.name}</h3>
          <StatusDot status={persona.research_status} />
        </div>
        <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-0.5">{persona.description}</p>
      </div>

      {/* Right: meta + actions */}
      <div className="flex items-center gap-3 shrink-0">
        {isComplete && meta.sources > 0 && (
          <span className="text-[11px] text-muted-foreground/40 hidden sm:block">
            {meta.sources} sources
          </span>
        )}
        {isResearching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
        )}
        {isFailed && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          >
            Retry
          </button>
        )}
        <span className="text-[11px] text-muted-foreground/30 hidden sm:block">
          {formatDate(persona.created_at)}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
        <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />;
    case "researching":
      return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />;
    case "failed":
      return <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />;
    default:
      return <span className="w-1.5 h-1.5 rounded-full bg-foreground/15 shrink-0" />;
  }
}

function MetaChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
      {icon}
      {value}
    </span>
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
