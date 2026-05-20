"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AgentBranding } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STORAGE_KEY = "agentdesk:agent-branding:v1";

const DEFAULT_BRANDING: AgentBranding = {
  name: "",
  brokerage: "",
  phone: "",
  email: "",
  location: "",
  logoUrl: null,
  avatarUrl: null,
};

interface AgentBrandingContextValue {
  branding: AgentBranding;
  initials: string;
  /** True when the agent has saved at least a name. */
  isConfigured: boolean;
  /** Alias for isConfigured. */
  hasProfile: boolean;
  /** True once we've attempted to load from Supabase. */
  isLoaded: boolean;
  updateBranding: (next: Partial<AgentBranding>) => void;
  setBranding: (next: AgentBranding) => void;
  resetBranding: () => void;
  /** Persist current branding to Supabase agent_profiles. */
  saveBranding: () => Promise<{ ok: boolean; error?: string }>;
}

const AgentBrandingContext = createContext<AgentBrandingContextValue | null>(
  null
);

function deriveInitials(name: string): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "AD";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readFromStorage(): AgentBranding {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw) as Partial<AgentBranding> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_BRANDING;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      brokerage:
        typeof parsed.brokerage === "string" ? parsed.brokerage : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      logoUrl:
        typeof parsed.logoUrl === "string" && parsed.logoUrl
          ? parsed.logoUrl
          : null,
      avatarUrl:
        typeof parsed.avatarUrl === "string" && parsed.avatarUrl
          ? parsed.avatarUrl
          : null,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function rowToBranding(row: Record<string, unknown> | null | undefined): AgentBranding | null {
  if (!row) return null;
  // Database column is `full_name`; map it to our in-app `name` field.
  // Tolerate either column name in case of legacy rows.
  const fullName =
    typeof row.full_name === "string"
      ? (row.full_name as string)
      : typeof row.name === "string"
      ? (row.name as string)
      : "";
  return {
    name: fullName,
    brokerage: typeof row.brokerage === "string" ? row.brokerage : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    email: typeof row.email === "string" ? row.email : "",
    location: typeof row.location === "string" ? row.location : "",
    logoUrl:
      typeof row.logo_url === "string" && row.logo_url
        ? (row.logo_url as string)
        : null,
    avatarUrl:
      typeof row.avatar_url === "string" && row.avatar_url
        ? (row.avatar_url as string)
        : null,
  };
}

async function persistToApi(branding: AgentBranding): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: branding.name ?? "",
        brokerage: branding.brokerage ?? "",
        phone: branding.phone ?? "",
        email: branding.email ?? "",
        location: branding.location ?? "",
        logoUrl: branding.logoUrl ?? "",
      }),
      credentials: "include",
    });
  } catch {
    // best-effort; localStorage remains source of truth on failure
  }
}

export function AgentBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<AgentBranding>(DEFAULT_BRANDING);
  const [hydrated, setHydrated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(
    null
  );

  if (!supabaseRef.current && typeof window !== "undefined") {
    try {
      supabaseRef.current = createSupabaseBrowserClient();
    } catch {
      supabaseRef.current = null;
    }
  }

  // Hydrate from localStorage first (instant UI), then sync with Supabase.
  useEffect(() => {
    setBrandingState(readFromStorage());
    setHydrated(true);
  }, []);

  // Pull from Supabase whenever auth state changes.
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadFor(userId: string | null) {
      userIdRef.current = userId;
      if (!userId) {
        setIsLoaded(true);
        return;
      }
      try {
        const { data, error } = await supabase!
          .from("agent_profiles")
          .select("full_name, email, brokerage, phone, location, logo_url")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          const next = rowToBranding(data as Record<string, unknown>);
          if (next) {
            // Merge: server is source of truth, but keep local fields if server is empty.
            setBrandingState((prev) => ({
              name: next.name || prev.name,
              brokerage: next.brokerage || prev.brokerage,
              phone: next.phone || prev.phone,
              email: next.email || prev.email,
              location: next.location || prev.location,
              logoUrl: next.logoUrl ?? prev.logoUrl,
              avatarUrl: next.avatarUrl ?? prev.avatarUrl,
            }));
          }
        }
      } catch {
        // ignore — fall back to local storage values
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      loadFor(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadFor(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Mirror to localStorage for offline / instant-paint fallback.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [branding, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setBrandingState(readFromStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateBranding = useCallback((next: Partial<AgentBranding>) => {
    setBrandingState((prev) => {
      const merged = { ...prev, ...next };
      // fire-and-forget API persistence
      void persistToApi(merged);
      return merged;
    });
  }, []);

  const setBranding = useCallback((next: AgentBranding) => {
    setBrandingState(next);
    // fire-and-forget API persistence so location + other fields
    // round-trip to the server in addition to localStorage.
    void persistToApi(next);
  }, []);

  const resetBranding = useCallback(() => {
    setBrandingState(DEFAULT_BRANDING);
    void persistToApi(DEFAULT_BRANDING);
  }, []);

  const saveBranding = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    const supabase = supabaseRef.current;
    if (!supabase) return { ok: false, error: "Supabase not configured" };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    const payload = {
      id: user.id,
      full_name: branding.name ?? "",
      email: branding.email ?? user.email ?? "",
      brokerage: branding.brokerage ?? "",
      phone: branding.phone ?? "",
      location: branding.location ?? "",
      logo_url: branding.logoUrl,
    };

    const { error } = await supabase
      .from("agent_profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) return { ok: false, error: error.message };
    // also mirror to API route for any server-side consumers
    void persistToApi(branding);
    return { ok: true };
  }, [branding]);

  const value = useMemo<AgentBrandingContextValue>(() => {
    const initials = deriveInitials(branding.name);
    const isConfigured = Boolean((branding.name ?? "").trim());
    return {
      branding,
      initials,
      isConfigured,
      hasProfile: isConfigured,
      isLoaded,
      updateBranding,
      setBranding,
      resetBranding,
      saveBranding,
    };
  }, [branding, isLoaded, updateBranding, setBranding, resetBranding, saveBranding]);

  return (
    <AgentBrandingContext.Provider value={value}>
      {children}
    </AgentBrandingContext.Provider>
  );
}

export function useAgentBranding(): AgentBrandingContextValue {
  const ctx = useContext(AgentBrandingContext);
  if (!ctx) {
    throw new Error(
      "useAgentBranding must be used within an AgentBrandingProvider"
    );
  }
  return ctx;
}

export { DEFAULT_BRANDING, deriveInitials };
export default AgentBrandingProvider;
