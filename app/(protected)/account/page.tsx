"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, LogOut, User } from "lucide-react";
import Link from "next/link";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || "");
        }
      })
      .catch(() => toast.error("Failed to load account"));
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
      setUser((u) => u ? { ...u, name } : u);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-medium text-sm">Account</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium">Profile</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
          <form onSubmit={handleSaveName} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Save name
            </Button>
          </form>
        </div>

        <Separator />

        {/* Password */}
        <div className="space-y-4">
          <h2 className="font-medium">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword}>
              {savingPassword && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Update password
            </Button>
          </form>
        </div>

        <Separator />

        {/* Sign out */}
        <div className="space-y-4">
          <h2 className="font-medium text-destructive">Sign out</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
