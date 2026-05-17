"use client";

import * as React from "react";
import { User, Phone, Mail, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { AgentBranding } from "@/app/client-report/page";

export interface AgentBrandingFormProps {
  value: AgentBranding;
  onChange: (next: AgentBranding) => void;
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

function AgentBrandingForm({ value, onChange }: AgentBrandingFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        id="agent-name"
        label="Agent name"
        icon={User}
        value={value.name}
        onChange={(v) => onChange({ ...value, name: v })}
        placeholder="Jordan Miller"
      />
      <Field
        id="agent-brokerage"
        label="Brokerage"
        icon={Building2}
        value={value.brokerage}
        onChange={(v) => onChange({ ...value, brokerage: v })}
        placeholder="AgentDesk Realty"
      />
      <Field
        id="agent-phone"
        label="Phone"
        icon={Phone}
        value={value.phone}
        onChange={(v) => onChange({ ...value, phone: v })}
        placeholder="(614) 555-0142"
        type="tel"
      />
      <Field
        id="agent-email"
        label="Email"
        icon={Mail}
        value={value.email}
        onChange={(v) => onChange({ ...value, email: v })}
        placeholder="jordan@agentdesk.app"
        type="email"
      />
    </div>
  );
}

export { AgentBrandingForm };
export default AgentBrandingForm;
