"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Key,
  Users,
  Loader2,
  Trash2,
  Plus,
  Link2,
  Copy,
  Check,
} from "lucide-react";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  hasApiKeys: boolean;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  email: string;
  name: string | null;
}

interface Invite {
  id: string;
  email: string;
  token: string;
  used: number;
  workspace_id: string | null;
  created_at: string;
}

interface SettingsClientProps {
  initialWorkspace: WorkspaceData;
  initialMembers: Member[];
  initialInvites: Invite[];
  role: string;
}

export default function SettingsClient({
  initialWorkspace,
  initialMembers,
  initialInvites,
  role,
}: SettingsClientProps) {
  const router = useRouter();
  const pn = usePathname();
  const slug = pn.split("/")[1] || "";
  const searchParams = useSearchParams();

  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [wsName, setWsName] = useState(initialWorkspace.name);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [replicateToken, setReplicateToken] = useState("");
  const [saving, setSaving] = useState(false);

  // Invites
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New workspace dialog
  const showNewWs = searchParams.get("tab") === "new-workspace";
  const [newWsName, setNewWsName] = useState("");
  const [newAnthropicKey, setNewAnthropicKey] = useState("");
  const [newReplicateToken, setNewReplicateToken] = useState("");
  const [creating, setCreating] = useState(false);

  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const refreshMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch { /* silent */ }
  }, [workspace.id]);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(Array.isArray(data.invites) ? data.invites : []);
      }
    } catch { /* silent */ }
  }, []);

  const handleSaveName = async () => {
    if (!wsName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName.trim() }),
      });
      if (res.ok) {
        toast.success("Workspace name updated");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropicApiKey: anthropicKey,
          replicateApiToken: replicateToken,
        }),
      });
      if (res.ok) {
        toast.success("API keys updated");
        setAnthropicKey("");
        setReplicateToken("");
        setWorkspace((w) => ({ ...w, hasApiKeys: true }));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      toast.success("Member removed");
      refreshMembers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to remove member");
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setCreatingInvite(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });
      if (res.ok) {
        toast.success("Invite created");
        setInviteEmail("");
        fetchInvites();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create invite");
      }
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    const res = await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Invite deleted");
      fetchInvites();
    } else {
      toast.error("Failed to delete invite");
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Invite link copied");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWsName.trim(),
          anthropicApiKey: newAnthropicKey.trim() || undefined,
          replicateApiToken: newReplicateToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetch("/api/workspaces/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: data.workspace.id }),
        });
        toast.success("Workspace created");
        router.push(`/${slug}/settings`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to create workspace");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Workspace name */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Workspace</h2>
            <Badge variant="secondary" className="text-[10px]">{role}</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              disabled={!isOwnerOrAdmin}
              placeholder="Workspace name"
            />
            {isOwnerOrAdmin && (
              <Button
                size="sm"
                disabled={saving || wsName === workspace.name}
                onClick={handleSaveName}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* API Keys — owner/admin only */}
        {isOwnerOrAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">API Keys</h2>
              {workspace.hasApiKeys && (
                <Badge variant="secondary" className="text-[10px]">Configured</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Update your workspace API keys. Leave blank to keep existing keys.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="anthKey" className="text-xs">Anthropic API Key</Label>
                <Input
                  id="anthKey"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="replToken" className="text-xs">Replicate API Token</Label>
                <Input
                  id="replToken"
                  type="password"
                  placeholder="r8_..."
                  value={replicateToken}
                  onChange={(e) => setReplicateToken(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={saving || (!anthropicKey && !replicateToken)}
                onClick={handleSaveKeys}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update keys"}
              </Button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Members</h2>
            <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg border text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-semibold shrink-0">
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-xs">{member.name || member.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                  {isOwnerOrAdmin && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveMember(member.user_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Links */}
        {isOwnerOrAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">Invite Links</h2>
              {invites.filter((i) => !i.used).length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {invites.filter((i) => !i.used).length} active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Create invite-only links to add members to this workspace. Each link is tied to an email address.
            </p>

            <form onSubmit={handleCreateInvite} className="flex gap-2">
              <Input
                placeholder="user@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={creatingInvite || !inviteEmail.trim()}>
                {creatingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1.5" />Create invite</>
                )}
              </Button>
            </form>

            {invites.length > 0 && (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{invite.email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {invite.used ? (
                          <span className="text-green-600">Used</span>
                        ) : (
                          <>
                            Pending · Created{" "}
                            {new Date(invite.created_at).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!invite.used && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyInviteLink(invite.token)}
                          title="Copy invite link"
                        >
                          {copiedToken === invite.token ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteInvite(invite.id)}
                        title="Delete invite"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create workspace dialog */}
      <Dialog open={showNewWs} onOpenChange={(open) => { if (!open) router.push(`/${slug}/settings`); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newWsName">Workspace name</Label>
              <Input
                id="newWsName"
                placeholder="e.g. My Brand"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newAnthKey">Anthropic API Key</Label>
              <Input
                id="newAnthKey"
                type="password"
                placeholder="sk-ant-... (optional)"
                value={newAnthropicKey}
                onChange={(e) => setNewAnthropicKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newReplToken">Replicate API Token</Label>
              <Input
                id="newReplToken"
                type="password"
                placeholder="r8_... (optional)"
                value={newReplicateToken}
                onChange={(e) => setNewReplicateToken(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => router.push(`/${slug}/settings`)}>Cancel</Button>
            <Button disabled={creating || !newWsName.trim()} onClick={handleCreateWorkspace}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
