"use client";

import { useState, useEffect, useCallback } from "react";
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
import { ArrowLeft, Copy, ExternalLink, ImageIcon, LayersIcon, Loader2, LogInIcon, Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";

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

export default function AdminPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [invRes, usersRes] = await Promise.all([
        fetch("/api/admin/invites"),
        fetch("/api/admin/users"),
      ]);

      if (!invRes.ok || !usersRes.ok) {
        toast.error("Access denied");
        return;
      }

      const [invData, userData] = await Promise.all([invRes.json(), usersRes.json()]);
      setInvites(invData.invites);
      setUsers(userData.users);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedUser(data);
    } catch {
      toast.error("Failed to load user details");
      setSelectedUser(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  const getInviteUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-medium text-sm">Admin</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Invites + Users */}
        <div className="lg:w-96 shrink-0 space-y-8">
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
                      <span title="Last active">{relativeTime(user.last_active)}</span>
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
        </div>

        {/* Right: User detail (gallery + decks) */}
        <div className="flex-1 min-w-0">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{selectedUser.user.email}</h2>
                  {selectedUser.user.name && <p className="text-sm text-muted-foreground">{selectedUser.user.name}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Joined {new Date(selectedUser.user.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{selectedUser.stats.login_count} logins</span>
                    <span>·</span>
                    <span>Last login {relativeTime(selectedUser.stats.last_login)}</span>
                    <span>·</span>
                    <span>Last active {relativeTime(selectedUser.stats.last_active)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedUser(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Gallery */}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full object-cover" />
                        <div className="p-1.5">
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{img.prompt}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{img.model} · {img.aspect_ratio}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Decks */}
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
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {deck.thumbnails.length > 0 ? (
                            deck.thumbnails.length === 1 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={deck.thumbnails[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                                {deck.thumbnails.slice(0, 4).map((url, i) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={i} src={url} alt="" className="w-full h-full object-cover" />
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
