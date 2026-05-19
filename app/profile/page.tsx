"use client";

import * as React from "react";
import Link from "next/link";
import { UserCircle2, Sparkles, Eye, KeyRound, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import ProfileForm from "@/components/profile/ProfileForm";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function ProfilePage() {
  const { branding, initials, isConfigured, hasGoogleKey, setBranding } =
    useAgentBranding() as ReturnType<typeof useAgentBranding> & {
      hasGoogleKey?: boolean;
    };

  const [loading, setLoading] = React.useState(true);

  // Pull the latest server-side profile on mount so we don't show stale
  // localStorage values for a freshly-logged-in user.
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("agent_profiles")
          .select("name, email, brokerage, phone, logo_url, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          setBranding({
            name: (data.name as string) ?? "",
            email: (data.email as string) ?? user.email ?? "",
            brokerage: (data.brokerage as string) ?? "",
            phone: (data.phone as string) ?? "",
            logoUrl: (data.logo_url as string | null) ?? null,
            avatarUrl: (data.avatar_url as string | null) ?? null,
          });
        }
      } catch {
        // ignore — fall back to local-storage hydrated values
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewName = (branding.name ?? "").trim() || "Your name";
  const previewSub = (() => {
    if (!isConfigured) return "Add your details to brand reports";
    if (branding.brokerage && branding.brokerage.trim()) return branding.brokerage;
    if (branding.email && branding.email.trim()) return branding.email;
    return "Realtor®";
  })();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-border pb-8">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Your Profile</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Agent identity, branding &amp; keys
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Set this once. Your name, brokerage, and contact info are synced to
          your AgentDesk account and applied everywhere AgentDesk represents
          you — sidebar, top bar, and every client report.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 md:p-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <ProfileForm />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Live sidebar preview
              </div>
              {isConfigured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--success))]">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Live
                </span>
              )}
            </div>
            <div className="bg-sidebar p-4">
              <div className="flex items-center gap-3 rounded-md p-2">
                <div
                  className={
                    "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold " +
                    (isConfigured
                      ? "bg-primary/20 text-sidebar-foreground"
                      : "bg-sidebar-foreground/10 text-sidebar-foreground/70")
                  }
                  aria-hidden="true"
                >
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.logoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-sidebar-foreground">
                    {previewName}
                  </div>
                  <div className="truncate text-xs text-sidebar-foreground/50">
                    {previewSub}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {typeof hasGoogleKey === "boolean" && (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span
                  className={
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md " +
                    (hasGoogleKey
                      ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-semibold tracking-tight">
                    Google API key
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasGoogleKey
                      ? "Your key is saved and will be used for any Google-powered features (address autocomplete, maps, etc.)."
                      : "No key set. Google Places autocomplete uses the workspace-level key."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Managed at the deployment level.
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-muted/30">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Where this shows up
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Sidebar:</span>{" "}
                the avatar bubble in the bottom-left uses your initials (or
                logo), and the name/brokerage beneath it updates instantly.
              </li>
              <li>
                <span className="font-medium text-foreground">Top bar:</span>{" "}
                quick-access chip on every page links straight back here.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Client reports:
                </span>{" "}
                header and footer of every printed/emailed report use this
                info — set it once and it&apos;s applied everywhere, including
                on the{" "}
                <Link
                  href="/client-report"
                  className="font-medium text-primary hover:underline"
                >
                  Client Report
                </Link>{" "}
                page.
              </li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Synced to your AgentDesk account. Sign out from the sidebar.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
