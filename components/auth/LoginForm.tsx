"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import createSupabaseBrowserClient from "@/lib/supabase/client";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const initialError = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null
  );
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setFormError(error.message);
        toast.error("Sign-in failed", { description: error.message });
        return;
      }

      toast.success("Welcome back");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error. Try again.";
      setFormError(message);
      toast.error("Sign-in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@brokerage.com"
            className="pl-9"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={submitting}
            required
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            Forgot?
          </Link>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={submitting}
            required
          />
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={submitting}
        aria-label="Sign in to AgentDesk"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

export default LoginForm;
