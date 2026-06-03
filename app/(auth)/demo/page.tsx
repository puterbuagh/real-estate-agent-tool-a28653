"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Lock, Loader2 } from "lucide-react";
import DemoLoginForm from "@/components/auth/DemoLoginForm";
import AuthCard from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function DemoPage() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsValidating(true);

    try {
      const response = await fetch("/api/demo-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to validate password");
      }

      const data = await response.json();

      if (data.isValid) {
        setIsUnlocked(true);
        setError("");
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch (err) {
      console.error("Password validation error:", err);
      const message = err instanceof Error ? err.message : "An error occurred";
      if (message.includes("not configured")) {
        toast.error(message);
      } else {
        setError(message);
      }
      setPassword("");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 mb-8"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_12px_hsl(var(--primary)/0.3)]">
            <Building2
              className="h-5 w-5 text-primary-foreground"
              strokeWidth={2.5}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-2xl font-semibold tracking-tight">
              AgentDesk
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              demo mode
            </span>
          </div>
        </Link>

        <AuthCard>
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                {isUnlocked ? "Try AgentDesk Demo" : "Demo Access"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isUnlocked
                  ? "Explore the platform with a pre-populated account"
                  : "Enter the demo password to continue"}
              </p>
            </div>

            {!isUnlocked ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Demo Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter demo password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoFocus
                      disabled={isValidating}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isValidating || !password}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Unlock Demo"
                  )}
                </Button>
              </form>
            ) : (
              <DemoLoginForm isUnlocked={isUnlocked} />
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Want your own account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </AuthCard>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            This demo account includes sample properties and data to showcase
            AgentDesk features.
          </p>
          <p>No real client information is stored or shared.</p>
        </div>
      </div>
    </div>
  );
}
