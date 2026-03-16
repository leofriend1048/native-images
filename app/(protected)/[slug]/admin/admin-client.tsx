"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { Building2, ChevronDown, Copy, ExternalLink, EyeIcon, ImageIcon, LayersIcon, Loader2, LogInIcon, Plus, Trash2, Users, X } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  token: string;
  used: number;
  created_at: string;
}

interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  is_admin: number;
  created_at: string;
  login_count: number;
  last_login: string | null;
  last_active: string | null;
  image_count: number;
  chat_count: number;
  deck_count: number;
}

interface AdminUserDetail {
  user: { id: string; email: string; name: string | null; is_admin: number; created_at: string };
  stats: { login_count: number; last_login: string | null; last_active: string | null; image_count: number; chat_count: number; deck_count: number };
  images: Array<{ id: string; url: string; prompt: string; model: string; aspect_ratio: string; created_at: string }>;
  decks: Array<{
    id: string;
    token: string;
    title: string;
    active: number;
    created_at: string;
    thumbnails: string[];
  }>;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
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

interface AdminClientProps {
  initialUsers: UserWithStats[];
  initialInvites: Invite[];
  currentWorkspace: WorkspaceSummary;
  allWorkspaces?: WorkspaceSummary[];
}

export default function AdminClient({ initialUsers, initialInvites, currentWorkspace, allWorkspaces }: AdminClientProps) {
  const router = useRouter();
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary>(currentWorkspace);
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [users, setUsers] = useState<UserWithStats[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const switchWorkspace = useCallback(async (ws: WorkspaceSummary) => {
    if (ws.id === activeWorkspace.id) {
      setWsDropdownOpen(false);
      return;
    }
    setLoadingWorkspace(true);
    setSelectedUser(null);
    setWsDropdownOpen(false);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch(`/api/admin/users?workspaceId=${ws.id}`),
        fetch(`/api/admin/invites?workspaceId=${ws.id}`),
      ]);
      if (!usersRes.ok || !invitesRes.ok) throw new Error();
      const [usersData, invitesData] = await Promise.all([usersRes.json(), invitesRes.json()]);
      setUsers(usersData.users);
      setInvites(Array.isArray(invitesData.invites) ? invitesData.invites : []);
      setActiveWorkspace(ws);
    } catch {
      toast.error("Failed to load workspace data");
    } finally {
      setLoadingWorkspace(false);
    }
  }, [activeWorkspace.id]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}?workspaceId=${activeWorkspace.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedUser(data);
    } catch {
      toast.error("Failed to load user details");
      setSelectedUser(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [activeWorkspace.id]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workspaceId: activeWorkspace.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create invite");
        return;
      }
      setInvites((prev) => [data.invite, ...prev]);
      setEmail("");
      toast.success("Invite created");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const res = await fetch("/api/admin/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Failed to delete invite");
        return;
      }
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invite deleted");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (selectedUser?.user.id === id) setSelectedUser(null);
      toast.success("User removed");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to impersonate");
        return;
      }
      // Redirect to target user's workspace
      router.push(`/${activeWorkspace.slug}/chat`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
      setImpersonating(null);
    }
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Workspace switcher + Invites + Users */}
        <div className="lg:w-96 shrink-0 space-y-6">
          {/* Workspace switcher */}
          {allWorkspaces && allWorkspaces.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{activeWorkspace.name}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${wsDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {wsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWsDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 z-40 rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
                    {allWorkspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => switchWorkspace(ws)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          ws.id === activeWorkspace.id ? "bg-muted font-medium" : ""
                        }`}
                      >
                        <span className="truncate block">{ws.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{ws.slug}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {loadingWorkspace ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Create invite */}
              <div className="space-y-4">
                <h2 className="font-medium text-sm">Send invite</h2>
                <form onSubmit={handleCreateInvite} className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="email" className="sr-only">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={creating} size="sm">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </form>
              </div>

              {/* Invites list */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invites</h3>
                  <div className="space-y-1.5">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-card text-sm">
                        <div className="flex-1 min-w-0 truncate">{invite.email}</div>
                        <Badge variant={invite.used ? "secondary" : "default"} className="text-[10px] shrink-0">{invite.used ? "Used" : "Pending"}</Badge>
                        {!invite.used && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyInviteLink(invite.token)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete invite?</AlertDialogTitle>
                                  <AlertDialogDescription>Invalidates the link for {invite.email}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInvite(invite.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Users list */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium text-sm">Users ({users.length})</h2>
                </div>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border bg-card cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedUser?.user.id === user.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => fetchUserDetail(user.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{user.email}</span>
                          {user.is_admin === 1 && <Badge variant="secondary" className="text-[10px] shrink-0">Admin</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span title="Logins"><LogInIcon className="h-2.5 w-2.5 inline" /> {user.login_count}</span>
                          <span>·</span>
                          <span title="Images"><ImageIcon className="h-2.5 w-2.5 inline" /> {user.image_count}</span>
                          <span>·</span>
                          <span title="Decks"><LayersIcon className="h-2.5 w-2.5 inline" /> {user.deck_count}</span>
                          <span>·</span>
                          <span title="Last active" suppressHydrationWarning>{relativeTime(user.last_active)}</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove user?</AlertDialogTitle>
                            <AlertDialogDescription>{user.email} will lose access immediately.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: User detail */}
        <div className="flex-1 min-w-0">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{selectedUser.user.email}</h2>
                  {selectedUser.user.name && <p className="text-sm text-muted-foreground">{selectedUser.user.name}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Joined {new Date(selectedUser.user.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{selectedUser.stats.login_count} logins</span>
                    <span>·</span>
                    <span suppressHydrationWarning>Last login {relativeTime(selectedUser.stats.last_login)}</span>
                    <span>·</span>
                    <span suppressHydrationWarning>Last active {relativeTime(selectedUser.stats.last_active)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={impersonating === selectedUser.user.id}
                    onClick={() => handleImpersonate(selectedUser.user.id)}
                  >
                    {impersonating === selectedUser.user.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <EyeIcon className="h-3 w-3" />
                    )}
                    Login as
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedUser(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Gallery ({selectedUser.images.length})
                </h3>
                {selectedUser.images.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No images yet</p>
                ) : (
                  <div className="columns-3 sm:columns-4 gap-2">
                    {selectedUser.images.map((img) => (
                      <a
                        key={img.id}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-inside-avoid mb-2 rounded-lg overflow-hidden border hover:border-foreground/30 transition-colors"
                      >
                        <div className="relative" style={{ aspectRatio: img.aspect_ratio?.replace(":", "/") ?? "4/5" }}>
                          <Image src={img.url} alt="" fill sizes="(max-width: 640px) 33vw, 25vw" className="object-cover" />
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{img.prompt}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{img.model} · {img.aspect_ratio}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <LayersIcon className="h-4 w-4" />
                  Decks ({selectedUser.decks.length})
                </h3>
                {selectedUser.decks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No decks yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedUser.decks.map((deck) => (
                      <a
                        key={deck.id}
                        href={`/deck/${deck.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                          {deck.thumbnails.length > 0 ? (
                            deck.thumbnails.length === 1 ? (
                              <Image src={deck.thumbnails[0]} alt="" fill sizes="64px" className="object-cover" />
                            ) : (
                              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                                {deck.thumbnails.slice(0, 4).map((url, i) => (
                                  <div key={i} className="relative">
                                    <Image src={url} alt="" fill sizes="32px" className="object-cover" />
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <LayersIcon className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{deck.title}</span>
                            <Badge variant={deck.active ? "default" : "secondary"} className="text-[10px] shrink-0">{deck.active ? "Live" : "Off"}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">/deck/{deck.token}</p>
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-primary">
                            <ExternalLink className="h-2.5 w-2.5" /> Open in new tab
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a user</p>
              <p className="text-xs mt-1">Click a user to view their gallery, decks, and activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
