"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const DEMO_EMAIL = "demo@agentdesk.app";
const DEMO_PASSWORD = "demo123";

interface DemoLoginFormProps {
  isUnlocked: boolean;
}

export default function DemoLoginForm({ isUnlocked }: DemoLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDemoLogin = useCallback(async () => {
    if (isLoading || !isUnlocked) return;

    setIsLoading(true);

    try {
      // Validate environment variables before attempting sign-in
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast.error(
          "Authentication configuration error. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        setIsLoading(false);
        return;
      }

      // Instantiate Supabase client with anon key
      const supabase = createSupabaseBrowserClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (error) {
        console.error("Demo login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error(
            "Demo account not found or incorrect password. Ensure demo@agentdesk.app exists in Supabase Dashboard (Authentication > Users) with password matching the DEMO_PASSWORD environment variable."
          );
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("Login failed: No user data returned");
        setIsLoading(false);
        return;
      }

      toast.success("Welcome to AgentDesk Demo!");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Demo login exception:", err);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }, [isLoading, isUnlocked, router]);

  if (!isUnlocked) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Try Demo Account
          </>
        )}
      </Button>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              What&apos;s included in the demo:
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Pre-populated agent profile</li>
              <li>• Sample properties in pipeline</li>
              <li>• Market data and analytics</li>
              <li>• Full feature access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
