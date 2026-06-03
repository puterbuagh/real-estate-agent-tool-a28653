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
import createSupabaseBrowserClient from "@/lib/supabase/client";

const STORAGE_KEY = "agentdesk:agent-branding:v1";
const SUPABASE_SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "agentdesk";

const DEFAULT_BRANDING: AgentBranding = {
  fullName: "",
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
  isConfigured: boolean;
  hasProfile: boolean;
  isLoaded: boolean;
  updateBranding: (next: Partial<AgentBranding>) => void;
  setBranding: (next: AgentBranding) => void;
  resetBranding: () => void;
  saveBranding: () => Promise<{ ok: boolean; error?: string }>;
}

const AgentBrandingContext = createContext<AgentBrandingContextValue | null>(
  null
);

function deriveInitials(fullName: string): string {
  const cleaned = (fullName ?? "").trim();
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
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
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
  const fullName =
    typeof row.full_name === "string"
      ? (row.full_name as string)
      : "";
  return {
    fullName,
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
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: branding.fullName ?? "",
        brokerage: branding.brokerage ?? "",
        phone: branding.phone ?? "",
        email: branding.email ?? "",
        location: branding.location ?? "",
        logoUrl: branding.logoUrl ?? "",
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("[AgentBrandingContext] API persist failed:", {
        status: res.status,
        error: errorData.error,
      });
    }
  } catch (err) {
    console.error("[AgentBrandingContext] API persist error:", err);
  }
}

function AgentBrandingProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    setBrandingState(readFromStorage());
    setHydrated(true);
  }, []);

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
          .schema(SUPABASE_SCHEMA)
          .from("agent_profiles")
          .select("full_name, email, brokerage, phone, location, logo_url")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("[AgentBrandingContext] Fetch error:", error);
        } else if (data) {
          const next = rowToBranding(data as Record<string, unknown>);
          if (next) {
            setBrandingState((prev) => ({
              fullName: next.fullName || prev.fullName,
              brokerage: next.brokerage || prev.brokerage,
              phone: next.phone || prev.phone,
              email: next.email || prev.email,
              location: next.location || prev.location,
              logoUrl: next.logoUrl ?? prev.logoUrl,
              avatarUrl: next.avatarUrl ?? prev.avatarUrl,
            }));
          }
        }
      } catch (err) {
        console.error("[AgentBrandingContext] Unexpected fetch error:", err);
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

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    } catch (err) {
      console.error("[AgentBrandingContext] localStorage write error:", err);
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
      persistToApi(merged).catch((err) => {
        console.error("[AgentBrandingContext] persistToApi failed:", err);
      });
      return merged;
    });
  }, []);

  const setBranding = useCallback((next: AgentBranding) => {
    setBrandingState(next);
    persistToApi(next).catch((err) => {
      console.error("[AgentBrandingContext] persistToApi failed:", err);
    });
  }, []);

  const resetBranding = useCallback(() => {
    setBrandingState(DEFAULT_BRANDING);
    persistToApi(DEFAULT_BRANDING).catch((err) => {
      console.error("[AgentBrandingContext] persistToApi failed:", err);
    });
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
      full_name: branding.fullName ?? "",
      email: branding.email ?? user.email ?? "",
      brokerage: branding.brokerage ?? "",
      phone: branding.phone ?? "",
      location: branding.location ?? "",
      logo_url: branding.logoUrl,
    };

    const { error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from("agent_profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[AgentBrandingContext] saveBranding upsert error:", error);
      return { ok: false, error: error.message };
    }
    persistToApi(branding).catch((err) => {
      console.error("[AgentBrandingContext] persistToApi failed:", err);
    });
    return { ok: true };
  }, [branding]);

  const value = useMemo<AgentBrandingContextValue>(() => {
    const initials = deriveInitials(branding.fullName);
    const isConfigured = Boolean((branding.fullName ?? "").trim());
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

function useAgentBranding(): AgentBrandingContextValue {
  const ctx = useContext(AgentBrandingContext);
  if (!ctx) {
    throw new Error(
      "useAgentBranding must be used within an AgentBrandingProvider"
    );
  }
  return ctx;
}

export { DEFAULT_BRANDING, deriveInitials, AgentBrandingProvider, useAgentBranding };
export default AgentBrandingProvider;
