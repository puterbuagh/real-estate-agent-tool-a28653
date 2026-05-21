"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { usePipeline } from "@/context/PipelineContext";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import ComparisonSelector from "@/components/client-report/ComparisonSelector";
import ReportPreview from "@/components/client-report/ReportPreview";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Comparison } from "@/types";

const CLIENT_NAME_KEY = "agentdesk:client-report:client-name";

function ClientReportInner() {
  const [mounted, setMounted] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState<string>("");

  const pipelineCtx = usePipeline();
  const comparisons: Comparison[] = pipelineCtx?.comparisons ?? [];
  const { branding } = useAgentBranding();

  const searchParams = useSearchParams();

  React.useEffect(() => {
    setMounted(true);
    try {
      const idFromUrl = searchParams?.get("id") ?? null;
      if (idFromUrl) setSelectedId(idFromUrl);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      try {
        const storedClient = window.localStorage.getItem(CLIENT_NAME_KEY);
        if (storedClient) setClientName(storedClient);
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CLIENT_NAME_KEY, clientName);
    } catch {
      // ignore
    }
  }, [clientName, mounted]);

  const selected: Comparison | null = React.useMemo(() => {
    if (!selectedId) return null;
    return comparisons.find((c) => c.id === selectedId) ?? null;
  }, [selectedId, comparisons]);

  if (!mounted) {
    return (
      <Card className="p-8">
        <div className="space-y-3">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-3 w-72 animate-pulse rounded bg-muted" />
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <section
        className="grid gap-6 lg:grid-cols-[1fr_1fr] no-print"
        data-print-hide="true"
      >
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              1. Pick a comparison
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Pulls from comparisons you&rsquo;ve saved on the Property Comparator.
            </p>
          </div>
          <ComparisonSelector
            comparisons={comparisons}
            value={selectedId}
            onChange={setSelectedId}
          />

          <div className="pt-2 border-t border-border">
            <label
              htmlFor="client-name"
              className="text-xs font-medium text-foreground"
            >
              Client name
            </label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. The Reynolds Family"
              className="mt-1.5"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Appears on the cover as &ldquo;Prepared exclusively for&hellip;&rdquo;
            </p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              2. Your branding
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Managed on your Profile page. Changes apply to all reports.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-display text-base font-semibold tracking-tight text-foreground">
              {branding.fullName || "Set your name on the Profile page"}
            </p>
            {branding.brokerage && (
              <p className="text-sm text-muted-foreground">
                {branding.brokerage}
              </p>
            )}
            {branding.phone && (
              <p className="text-xs text-muted-foreground">
                {branding.phone}
              </p>
            )}
            {branding.email && (
              <p className="text-xs text-muted-foreground">
                {branding.email}
              </p>
            )}
          </div>
        </Card>
      </section>

      <ReportPreview
        comparison={selected}
        branding={branding}
        clientName={clientName}
      />
    </>
  );
}

function ClientReportFallback() {
  return (
    <Card className="p-8">
      <div className="space-y-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3 w-72 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}

function ClientReportClient() {
  return (
    <div className="space-y-8">
      <header
        className="flex flex-col gap-2 border-b border-border pb-6 no-print"
        data-print-hide="true"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Client Deliverables</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Client Report Generator
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Turn any saved comparison into a branded, print-ready PDF for your buyer or seller in under a minute.
        </p>
      </header>

      <Suspense fallback={<ClientReportFallback />}>
        <ClientReportInner />
      </Suspense>
    </div>
  );
}

export default ClientReportClient;
