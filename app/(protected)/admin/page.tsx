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
import { ArrowLeft, Copy, Loader2, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";

interface Invite {
  id: string;
  email: string;
  token: string;
  used: number;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: number;
  created_at: string;
}

export default function AdminPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-medium text-sm">Admin</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Create invite */}
        <div className="space-y-4">
          <h2 className="font-medium">Send invite</h2>
          <form onSubmit={handleCreateInvite} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">Create invite</span>
            </Button>
          </form>
        </div>

        {/* Invites list */}
        {invites.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Invites</h3>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{invite.email}</span>
                      <Badge
                        variant={invite.used ? "secondary" : "default"}
                        className="text-xs shrink-0"
                      >
                        {invite.used ? "Used" : "Pending"}
                      </Badge>
                    </div>
                    {!invite.used && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {getInviteUrl(invite.token)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!invite.used && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyInviteLink(invite.token)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete invite?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will invalidate the invite link for {invite.email}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Users list */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">
              Users{" "}
              <span className="text-muted-foreground font-normal">({users.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{user.email}</span>
                    {user.is_admin === 1 && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Admin
                      </Badge>
                    )}
                  </div>
                  {user.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{user.name}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {user.email} will lose access immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
