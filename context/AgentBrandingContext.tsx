"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgentBranding } from "@/types";

const STORAGE_KEY = "agentdesk:agent-branding:v1";

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

function AgentBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<AgentBranding>(DEFAULT_BRANDING);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBrandingState(readFromStorage());
    setHydrated(true);
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
    setBrandingState((prev) => ({ ...prev, ...next }));
  }, []);

  const setBranding = useCallback((next: AgentBranding) => {
    setBrandingState(next);
  }, []);

  const resetBranding = useCallback(() => {
    setBrandingState(DEFAULT_BRANDING);
  }, []);

  const saveBranding = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    return { ok: true };
  }, []);

  const value = useMemo<AgentBrandingContextValue>(() => {
    const initials = deriveInitials(branding.fullName);
    const isConfigured = Boolean((branding.fullName ?? "").trim());
    return {
      branding,
      initials,
      isConfigured,
      hasProfile: isConfigured,
      isLoaded: true,
      updateBranding,
      setBranding,
      resetBranding,
      saveBranding,
    };
  }, [branding, updateBranding, setBranding, resetBranding, saveBranding]);

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
