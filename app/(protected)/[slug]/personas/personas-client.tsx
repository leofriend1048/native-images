"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  SearchIcon,
  Loader2,
  ChevronLeftIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PersonaResearchReport } from "@/components/persona-research-report";

interface Persona {
  id: string;
  name: string;
  description: string;
  research: string | null;
  research_status: string;
  created_at: string;
}

export default function PersonasClient({ initialPersonas }: { initialPersonas: Persona[] }) {
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
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
    toast.success("Persona deleted");
  }, [viewingId]);

  // ── Detail view ────────────────────────────────────────────────────────────
  if (viewingPersona) {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        <button
          onClick={() => setViewingId(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to personas
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">{viewingPersona.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{viewingPersona.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={viewingPersona.research_status} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(viewingPersona.id)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <PersonaResearchReport
            research={viewingPersona.research}
            status={viewingPersona.research_status}
            onRegenerate={() => triggerResearch(viewingPersona.id)}
          />
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Personas</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Persona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Persona</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  placeholder="e.g. Acne-prone millennial mom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Describe who this persona is and what they care about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Product (for research context)</label>
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create & Research
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UsersIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No personas yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create a persona to generate a deep research dossier
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewingId(p.id)}
              className="w-full text-left border rounded-lg p-4 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">{p.name}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.research_status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <Badge variant="secondary" className="text-[10px]">Researched</Badge>;
    case "researching":
      return (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Researching
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">No research</Badge>;
  }
}
