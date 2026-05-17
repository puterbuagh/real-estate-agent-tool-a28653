"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { usePipeline } from "@/context/PipelineContext";
import ComparisonSelector from "@/components/client-report/ComparisonSelector";
import AgentBrandingForm from "@/components/client-report/AgentBrandingForm";
import ReportPreview from "@/components/client-report/ReportPreview";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Comparison } from "@/types";

export interface AgentBranding {
  name: string;
  phone: string;
  email: string;
  brokerage: string;
}

const DEFAULT_BRANDING: AgentBranding = {
  name: "Jordan Miller",
  phone: "(614) 555-0142",
  email: "jordan@agentdesk.app",
  brokerage: "AgentDesk Realty",
};

const BRANDING_KEY = "agentdesk:agent-branding:v1";
const CLIENT_NAME_KEY = "agentdesk:client-report:client-name";

function ClientReportPage() {
  const { comparisons } = usePipeline();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [selectedId, setSelectedId] = React.useState<string | null>(initialId);
  const [branding, setBranding] = React.useState<AgentBranding>(DEFAULT_BRANDING);
  const [clientName, setClientName] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(BRANDING_KEY);
      if (stored) setBranding({ ...DEFAULT_BRANDING, ...JSON.parse(stored) });
      const storedClient = window.localStorage.getItem(CLIENT_NAME_KEY);
      if (storedClient) setClientName(storedClient);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
  }, [branding, hydrated]);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(CLIENT_NAME_KEY, clientName);
  }, [clientName, hydrated]);

  const selected: Comparison | null = React.useMemo(() => {
    if (!selectedId) return null;
    return comparisons.find((c) => c.id === selectedId) ?? null;
  }, [selectedId, comparisons]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-border pb-6 no-print" data-print-hide="true">
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

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] no-print" data-print-hide="true">
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">1. Pick a comparison</h2>
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
            <label htmlFor="client-name" className="text-xs font-medium text-foreground">
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
            <h2 className="font-display text-lg font-semibold tracking-tight">2. Your branding</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Saved to this browser. Fill once, reuse for every client.
            </p>
          </div>
          <AgentBrandingForm value={branding} onChange={setBranding} />
        </Card>
      </section>

      <ReportPreview
        comparison={selected}
        branding={branding}
        clientName={clientName}
      />
    </div>
  );
}

export default ClientReportPage;
