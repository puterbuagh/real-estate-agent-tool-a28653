"use client";

import * as React from "react";
import Link from "next/link";
import { UserCircle2, Sparkles, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import AgentBrandingForm from "@/components/client-report/AgentBrandingForm";
import { useAgentBranding } from "@/context/AgentBrandingContext";

export const dynamic = "force-dynamic";

function ProfilePage() {
  const { branding, initials, isConfigured } = useAgentBranding();

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
          Agent identity &amp; branding
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Set this once. Your name, brokerage, and contact info appear on the
          sidebar, client reports, and anywhere else AgentDesk represents you.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 md:p-8">
          <AgentBrandingForm />
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
                info — set it once on the{" "}
                <Link
                  href="/client-report"
                  className="font-medium text-primary hover:underline"
                >
                  Client Report
                </Link>{" "}
                page and it&apos;s applied everywhere.
              </li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Saved locally to this browser. Sign-in sync is coming later.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
