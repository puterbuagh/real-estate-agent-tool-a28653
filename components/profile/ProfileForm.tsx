"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Save,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import { cn } from "@/lib/utils";
import type { AgentBranding } from "@/types";

const schema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(80, "Name is too long"),
  brokerage: z
    .string()
    .trim()
    .max(120, "Brokerage is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(40, "Phone is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(120, "Email is too long")
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(100, "Location is too long")
    .optional()
    .or(z.literal("")),
  logoUrl: z
    .string()
    .max(2_500_000, "Logo too large")
    .optional()
    .or(z.literal("")),
});

type FormState = {
  fullName: string;
  brokerage: string;
  phone: string;
  email: string;
  location: string;
  logoUrl: string;
};

function toForm(b: AgentBranding): FormState {
  return {
    fullName: b.fullName ?? "",
    brokerage: b.brokerage ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
    location: b.location ?? "",
    logoUrl: b.logoUrl ?? "",
  };
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoComplete,
  required,
  helpText,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  helpText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "pl-9",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {helpText && !error && (
        <p className="text-[11px] text-muted-foreground">{helpText}</p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[11px] font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ProfileForm() {
  const { branding, initials, setBranding, resetBranding, isConfigured } =
    useAgentBranding();
  const [form, setForm] = React.useState<FormState>(() => toForm(branding));
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  React.useEffect(() => {
    setForm(toForm(branding));
    setDirty(false);
  }, [branding]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Logo too large — keep it under 1.5 MB.");
      return;
    }
    if (!/^image\//.test(file.type)) {
      toast.error("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      update("logoUrl", result);
    };
    reader.onerror = () => toast.error("Couldn't read that file.");
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      setBranding({
        fullName: parsed.data.fullName,
        brokerage: parsed.data.brokerage || "",
        phone: parsed.data.phone || "",
        email: parsed.data.email || "",
        location: parsed.data.location || "",
        logoUrl: parsed.data.logoUrl || "",
        avatarUrl: branding.avatarUrl ?? null,
      });
      setErrors({});
      setDirty(false);
      setJustSaved(true);
      toast.success("Profile saved", {
        description: "Your branding is now live across AgentDesk.",
      });
      window.setTimeout(() => setJustSaved(false), 2400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Reset your profile? This clears your saved branding from this browser."
      );
      if (!ok) return;
    }
    resetBranding();
    toast.success("Profile reset");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-lg font-semibold text-primary">
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt="Agent logo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight text-foreground truncate">
            {form.fullName || "Your name"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {form.brokerage || "Add your brokerage"}
          </p>
          {!isConfigured ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              Set up your profile to brand reports
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--success))]">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Profile active
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="profile-fullName"
          label="Full name"
          icon={User}
          value={form.fullName}
          onChange={(v) => update("fullName", v)}
          placeholder="Your full name"
          autoComplete="name"
          error={errors.fullName}
          required
        />
        <Field
          id="profile-brokerage"
          label="Brokerage"
          icon={Building2}
          value={form.brokerage}
          onChange={(v) => update("brokerage", v)}
          placeholder="Your brokerage name"
          autoComplete="organization"
          error={errors.brokerage}
        />
        <Field
          id="profile-phone"
          label="Phone"
          icon={Phone}
          value={form.phone}
          onChange={(v) => update("phone", v)}
          placeholder="(555) 123-4567"
          type="tel"
          autoComplete="tel"
          error={errors.phone}
        />
        <Field
          id="profile-email"
          label="Email"
          icon={Mail}
          value={form.email}
          onChange={(v) => update("email", v)}
          placeholder="your@email.com"
          type="email"
          autoComplete="email"
          error={errors.email}
        />
        <div className="sm:col-span-2">
          <Field
            id="profile-location"
            label="Market location (state)"
            icon={MapPin}
            value={form.location}
            onChange={(v) => update("location", v)}
            placeholder="Florida"
            autoComplete="address-level1"
            error={errors.location}
            helpText="Used to localize mortgage rates and market stats (e.g. Florida, Ohio, Texas)."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-logo" className="text-xs font-medium text-foreground">
          Logo or headshot (optional)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="profile-logo"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {form.logoUrl ? "Replace image" : "Upload image"}
          </label>
          <input
            id="profile-logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleLogoUpload}
          />
          {form.logoUrl && (
            <button
              type="button"
              onClick={() => update("logoUrl", "")}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            PNG or JPG, max 1.5 MB. Stored locally.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          className="mr-auto text-muted-foreground hover:text-destructive"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset profile
        </Button>
        {justSaved && !dirty && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Saved
          </span>
        )}
        <Button type="submit" loading={submitting} disabled={submitting || !dirty}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {isConfigured ? "Save changes" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export { ProfileForm };
export default ProfileForm;
