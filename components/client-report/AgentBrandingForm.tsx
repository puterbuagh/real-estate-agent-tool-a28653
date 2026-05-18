"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { User, Phone, Mail, Building2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import type { AgentBranding } from "@/types";

const PLACEHOLDER_BRANDING: AgentBranding = {
  name: "",
  phone: "",
  email: "",
  brokerage: "",
  logoUrl: "",
};

export interface AgentBrandingFormProps {
  value?: AgentBranding;
  onChange?: (next: AgentBranding) => void;
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    </div>
  );
}

/**
 * AgentBrandingForm — wired to the global AgentBrandingContext.
 *
 * Edits propagate immediately to the Sidebar, Profile page, and every
 * surface that consumes useAgentBranding(). The optional `value` /
 * `onChange` props are kept for legacy callers but the context is the
 * source of truth.
 */
function AgentBrandingForm({ value, onChange }: AgentBrandingFormProps) {
  const { branding, setBranding, isConfigured } = useAgentBranding();
  const [justSaved, setJustSaved] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const safe: AgentBranding = branding ?? value ?? PLACEHOLDER_BRANDING;

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const commit = (next: AgentBranding) => {
    setBranding(next);
    onChange?.(next);

    // Debounced "saved" confirmation — feels alive without spamming toasts.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setJustSaved(true);
      toast.success("Branding saved", {
        description: "Your profile is now applied across AgentDesk.",
        duration: 2200,
      });
      setTimeout(() => setJustSaved(false), 1800);
    }, 600);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Edits here update your sidebar &amp; all client reports instantly.
        </p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Manage profile
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="agent-name"
          label="Agent name"
          icon={User}
          value={safe.name ?? ""}
          onChange={(v) => commit({ ...safe, name: v })}
          placeholder="Jordan Miller"
        />
        <Field
          id="agent-brokerage"
          label="Brokerage"
          icon={Building2}
          value={safe.brokerage ?? ""}
          onChange={(v) => commit({ ...safe, brokerage: v })}
          placeholder="AgentDesk Realty"
        />
        <Field
          id="agent-phone"
          label="Phone"
          icon={Phone}
          value={safe.phone ?? ""}
          onChange={(v) => commit({ ...safe, phone: v })}
          placeholder="(614) 555-0142"
          type="tel"
        />
        <Field
          id="agent-email"
          label="Email"
          icon={Mail}
          value={safe.email ?? ""}
          onChange={(v) => commit({ ...safe, email: v })}
          placeholder="jordan@agentdesk.app"
          type="email"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-muted-foreground">
          {isConfigured
            ? "Profile is live across AgentDesk."
            : "Add at least your name and email to brand your reports."}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium transition-opacity ${
            justSaved ? "opacity-100 text-[hsl(var(--success))]" : "opacity-0"
          }`}
          aria-live="polite"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Saved
        </span>
      </div>
    </div>
  );
}

export { AgentBrandingForm, PLACEHOLDER_BRANDING };
export default AgentBrandingForm;
