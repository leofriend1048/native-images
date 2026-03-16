"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

type Step = "account" | "workspace" | "apikeys";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Workspace fields
  const [workspaceName, setWorkspaceName] = useState("");

  // API key fields
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [replicateApiToken, setReplicateApiToken] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          workspaceName,
          anthropicApiKey,
          replicateApiToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Account created!");
      router.push(`/${data.workspace.slug}/chat`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canAdvanceFromAccount = name.trim() && email.trim() && password.length >= 8;
  const canAdvanceFromWorkspace = workspaceName.trim().length > 0;
  const canSubmit = anthropicApiKey.trim() && replicateApiToken.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-foreground mb-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-background"
            >
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            {step === "account" && "Step 1 of 3 — Your details"}
            {step === "workspace" && "Step 2 of 3 — Name your workspace"}
            {step === "apikeys" && "Step 3 of 3 — Connect your API keys"}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {(["account", "workspace", "apikeys"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-8 bg-foreground" : i < ["account", "workspace", "apikeys"].indexOf(step) ? "w-4 bg-foreground/40" : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "account" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button
              className="w-full"
              disabled={!canAdvanceFromAccount}
              onClick={() => setStep("workspace")}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "workspace" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                type="text"
                placeholder="e.g. My Brand, Acme Corp"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is your team or brand name. You can change it later.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("account")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canAdvanceFromWorkspace}
                onClick={() => setStep("apikeys")}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "apikeys" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropicKey">Anthropic API Key</Label>
              <Input
                id="anthropicKey"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Get your key at{" "}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">
                  console.anthropic.com
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replicateToken">Replicate API Token</Label>
              <Input
                id="replicateToken"
                type="password"
                placeholder="r8_..."
                value={replicateApiToken}
                onChange={(e) => setReplicateApiToken(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Get your token at{" "}
                <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">
                  replicate.com
                </a>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("workspace")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
