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

export interface PipelineContextValue {
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
  updatePipelineItem: (
    id: string,
    updates: Partial<Pick<PipelineItem, "address" | "stage" | "price" | "clientName">>
  ) => void;
  addComparison: (
    properties: ComparisonProperty[],
    label?: string
  ) => Comparison | null;
  deleteComparison: (id: string) => void;
  getComparisonById: (id: string) => Comparison | undefined;
  updateComparisonNotes: (id: string, notes: Record<string, string>) => void;
  updateComparisonClientName: (id: string, clientName: string) => void;
}

const DEFAULT_CONTEXT: PipelineContextValue = {
  pipeline: [],
  comparisons: [],
  comparisonsThisMonth: 0,
  addPipelineItem: () => {},
  removePipelineItem: () => {},
  updatePipelineStage: () => {},
  updatePipelineNotes: () => {},
  updatePipelineItem: () => {},
  addComparison: () => null,
  deleteComparison: () => {},
  getComparisonById: () => undefined,
  updateComparisonNotes: () => {},
  updateComparisonClientName: () => {},
};

const PipelineContext = createContext<PipelineContextValue>(DEFAULT_CONTEXT);

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
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
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    stageEnteredAt: item.stageEnteredAt ?? item.createdAt,
    price: item.price ?? null,
    clientName: item.clientName ?? null,
    notes: item.notes ?? "",
  }));
}

function normalizeComparisonProperty(
  p: Partial<ComparisonProperty> & { address?: string }
): ComparisonProperty {
  return {
    zpid: p.zpid ?? null,
    address: p.address ?? "",
    price: p.price ?? null,
    zestimate: p.zestimate ?? null,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    livingArea: p.livingArea ?? null,
    lotSize: p.lotSize ?? null,
    yearBuilt: p.yearBuilt ?? null,
    propertyType: p.propertyType ?? null,
    daysOnMarket: p.daysOnMarket ?? null,
    pricePerSqft: p.pricePerSqft ?? null,
    lastSoldPrice: p.lastSoldPrice ?? null,
    lastSoldDate: p.lastSoldDate ?? null,
    taxAssessedValue: p.taxAssessedValue ?? null,
    photo: p.photo ?? null,
  };
}

function normalizeComparisons(comps: Comparison[]): Comparison[] {
  if (!Array.isArray(comps)) return [];
  return comps.map((c) => ({
    ...c,
    properties: Array.isArray(c.properties)
      ? c.properties.map(normalizeComparisonProperty)
      : [],
    reportNotes: c.reportNotes ?? {},
    clientName: c.clientName ?? null,
  }));
}

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy mode
  }
}

function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedPipeline = safeParse<PipelineItem[]>(
        readLocalStorage(PIPELINE_KEY),
        []
      );
      setPipeline(normalizePipeline(storedPipeline));

      const storedComparisons = safeParse<Comparison[]>(
        readLocalStorage(COMPARISONS_KEY),
        []
      );
      setComparisons(normalizeComparisons(storedComparisons));
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      writeLocalStorage(PIPELINE_KEY, JSON.stringify(pipeline));
    } catch {
      // ignore
    }
  }, [pipeline, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocalStorage(COMPARISONS_KEY, JSON.stringify(comparisons));
  }, [comparisons, hydrated]);

  const addPipelineItem = useCallback(
    (addressOrInput: string | AddPipelineItemInput, stage?: PipelineStage) => {
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
      setPipeline((prev) => [...prev, item]);
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
          const stageEnteredAt = new Date().toISOString();
          return { ...p, stage, stageEnteredAt };
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

  const updatePipelineItem = useCallback(
    (
      id: string,
      updates: Partial<Pick<PipelineItem, "address" | "stage" | "price" | "clientName">>
    ) => {
      setPipeline((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const stageChanged = updates.stage && updates.stage !== p.stage;
          return {
            ...p,
            ...updates,
            stageEnteredAt: stageChanged ? new Date().toISOString() : p.stageEnteredAt,
          };
        })
      );
    },
    []
  );

  const addComparison = useCallback(
    (properties: ComparisonProperty[], label?: string): Comparison | null => {
      if (!properties || properties.length === 0) return null;

      const normalized = properties.map(normalizeComparisonProperty);

      const winner = [...normalized].sort(
        (a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0)
      )[0];

      const entry: Comparison = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        properties: normalized,
        winnerAddress: winner?.address ?? null,
        winnerZestimate: winner?.zestimate ?? null,
        reportNotes: {},
        clientName: null,
        label: label,
      };
      setComparisons((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const deleteComparison = useCallback((id: string) => {
    setComparisons((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getComparisonById = useCallback(
    (id: string) => comparisons.find((c) => c.id === id),
    [comparisons]
  );

  const updateComparisonNotes = useCallback(
    (id: string, notes: Record<string, string>) => {
      setComparisons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, reportNotes: notes } : c))
      );
    },
    []
  );

  const updateComparisonClientName = useCallback(
    (id: string, clientName: string) => {
      setComparisons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, clientName } : c))
      );
    },
    []
  );

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
      updatePipelineItem,
      addComparison,
      deleteComparison,
      getComparisonById,
      updateComparisonNotes,
      updateComparisonClientName,
    }),
    [
      pipeline,
      comparisons,
      comparisonsThisMonth,
      addPipelineItem,
      removePipelineItem,
      updatePipelineStage,
      updatePipelineNotes,
      updatePipelineItem,
      addComparison,
      deleteComparison,
      getComparisonById,
      updateComparisonNotes,
      updateComparisonClientName,
    ]
  );

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}

function usePipeline(): PipelineContextValue {
  return useContext(PipelineContext);
}

export { PipelineProvider, usePipeline };
export default PipelineProvider;
