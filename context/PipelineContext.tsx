"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type {
  PipelineItem,
  PipelineStage,
  Comparison,
  ComparedProperty,
  ComparisonProperty,
} from "@/types";

const PIPELINE_KEY = "agentdesk:pipeline:v1";
const COMPARISONS_KEY = "agentdesk:comparisons:v1";

export interface AddPipelineItemInput {
  address: string;
  stage: PipelineStage;
  price?: number | null;
  clientName?: string | null;
  notes?: string;
}

interface PipelineContextValue {
  pipeline: PipelineItem[];
  comparisons: Comparison[];
  comparisonsThisMonth: number;
  addPipelineItem: (
    addressOrInput: string | AddPipelineItemInput,
    stage?: PipelineStage
  ) => void;
  removePipelineItem: (id: string) => void;
  updatePipelineStage: (id: string, stage: PipelineStage) => void;
  updatePipelineNotes: (id: string, notes: string) => void;
  addComparison: (
    properties: ComparisonProperty[],
    label?: string
  ) => Comparison | null;
  deleteComparison: (id: string) => void;
}

const PipelineContext = createContext<PipelineContextValue | undefined>(
  undefined
);

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizePipeline(items: PipelineItem[]): PipelineItem[] {
  return items.map((item) => ({
    ...item,
    stageEnteredAt: item.stageEnteredAt ?? item.createdAt,
    price: item.price ?? null,
    clientName: item.clientName ?? null,
    notes: item.notes ?? "",
  }));
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = safeParse<PipelineItem[]>(
      window.localStorage.getItem(PIPELINE_KEY),
      []
    );
    setPipeline(normalizePipeline(stored));
    setComparisons(
      safeParse<Comparison[]>(window.localStorage.getItem(COMPARISONS_KEY), [])
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(PIPELINE_KEY, JSON.stringify(pipeline));
  }, [pipeline, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(COMPARISONS_KEY, JSON.stringify(comparisons));
  }, [comparisons, hydrated]);

  const addPipelineItem = useCallback(
    (
      addressOrInput: string | AddPipelineItemInput,
      stage?: PipelineStage
    ) => {
      const now = new Date().toISOString();
      let item: PipelineItem;
      if (typeof addressOrInput === "string") {
        item = {
          id: generateId(),
          address: addressOrInput.trim(),
          stage: stage ?? "Lead",
          createdAt: now,
          stageEnteredAt: now,
          price: null,
          clientName: null,
          notes: "",
        };
      } else {
        item = {
          id: generateId(),
          address: addressOrInput.address.trim(),
          stage: addressOrInput.stage,
          createdAt: now,
          stageEnteredAt: now,
          price: addressOrInput.price ?? null,
          clientName: addressOrInput.clientName?.trim() || null,
          notes: addressOrInput.notes ?? "",
        };
      }
      setPipeline((prev) => [item, ...prev]);
    },
    []
  );

  const removePipelineItem = useCallback((id: string) => {
    setPipeline((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePipelineStage = useCallback(
    (id: string, stage: PipelineStage) => {
      setPipeline((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (p.stage === stage) return p;
          return { ...p, stage, stageEnteredAt: new Date().toISOString() };
        })
      );
    },
    []
  );

  const updatePipelineNotes = useCallback((id: string, notes: string) => {
    setPipeline((prev) =>
      prev.map((p) => (p.id === id ? { ...p, notes } : p))
    );
  }, []);

  const addComparison = useCallback(
    (properties: ComparisonProperty[], label?: string): Comparison | null => {
      if (!properties || properties.length === 0) return null;

      const compared: ComparedProperty[] = properties.map((p) => ({
        address: p.address,
        zestimate: p.zestimate ?? null,
      }));

      const winner = [...properties].sort(
        (a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0)
      )[0];

      const entry: Comparison = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        properties: compared,
        winnerAddress: winner?.address ?? null,
        winnerZestimate: winner?.zestimate ?? null,
      };
      if (label) {
        // reserved for future labeling
      }
      setComparisons((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  const deleteComparison = useCallback((id: string) => {
    setComparisons((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const comparisonsThisMonth = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return comparisons.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  }, [comparisons]);

  const value = useMemo<PipelineContextValue>(
    () => ({
      pipeline,
      comparisons,
      comparisonsThisMonth,
      addPipelineItem,
      removePipelineItem,
      updatePipelineStage,
      updatePipelineNotes,
      addComparison,
      deleteComparison,
    }),
    [
      pipeline,
      comparisons,
      comparisonsThisMonth,
      addPipelineItem,
      removePipelineItem,
      updatePipelineStage,
      updatePipelineNotes,
      addComparison,
      deleteComparison,
    ]
  );

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline(): PipelineContextValue {
  const ctx = useContext(PipelineContext);
  if (!ctx) {
    throw new Error("usePipeline must be used within a PipelineProvider");
  }
  return ctx;
}

export default PipelineProvider;
