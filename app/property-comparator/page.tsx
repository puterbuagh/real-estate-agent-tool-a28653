"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Scale, Save, Printer, RotateCcw, Search, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import AddressInputs from "@/components/comparator/AddressInputs";
import PropertyCard from "@/components/comparator/PropertyCard";
import PropertySkeletonCard from "@/components/comparator/PropertySkeletonCard";
import { usePipeline } from "@/context/PipelineContext";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { ZillowProperty, ComparisonProperty } from "@/types";

const AGENT = {
  name: "Jordan Miller",
  title: "Ohio Realtor®",
  phone: "(614) 555-0142",
  email: "jordan@agentdesk.app",
};

const CONNECTION_ERROR_TYPES = new Set([
  "connection_error",
  "timeout",
  "rate_limited",
  "unknown",
]);

function PropertyComparatorPage() {
  const { addComparison } = usePipeline();
  const [addresses, setAddresses] = useState<string[]>(["", ""]);
  // Tracks which rows came from a confirmed Google Places selection.
  const [confirmedPlaces, setConfirmedPlaces] = useState<boolean[]>([false, false]);
  const [results, setResults] = useState<ZillowProperty[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadStartRef = useRef<number>(0);

  const [retryCooldowns, setRetryCooldowns] = useState<Record<string, number>>({});
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (Object.keys(retryCooldowns).length === 0) return;
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [retryCooldowns]);

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const validAddresses = useMemo(
    () => addresses.map((a) => a.trim()).filter((a) => a.length > 0),
    [addresses]
  );

  // Inline soft-warning: any address row with text that wasn't confirmed via
  // the Google Places dropdown. Doesn't block submission — Zillow can still
  // match many freeform strings — just nudges the agent for better hit rate.
  const unconfirmedRows = useMemo(
    () =>
      addresses
        .map((value, idx) => ({ value: value.trim(), idx, confirmed: confirmedPlaces[idx] }))
        .filter((r) => r.value.length >= 6 && !r.confirmed),
    [addresses, confirmedPlaces]
  );

  const successful = useMemo(
    () => (results ?? []).filter((p): p is ZillowProperty => p.status === "ok"),
    [results]
  );

  const connectionFailed = useMemo(
    () =>
      (results ?? []).filter(
        (p) =>
          p.status === "error" &&
          CONNECTION_ERROR_TYPES.has((p.errorType ?? "unknown") as string)
      ),
    [results]
  );

  const bestValueZpid = useMemo(() => {
    const withPpsf = successful.filter((p) => typeof p.pricePerSqft === "number" && p.pricePerSqft! > 0);
    if (withPpsf.length < 2) return null;
    return withPpsf.reduce((min, p) =>
      (p.pricePerSqft as number) < (min.pricePerSqft as number) ? p : min
    ).zpid;
  }, [successful]);

  const highestValueZpid = useMemo(() => {
    const withZest = successful.filter((p) => typeof p.zestimate === "number" && p.zestimate! > 0);
    if (withZest.length < 2) return null;
    return withZest.reduce((max, p) =>
      (p.zestimate as number) > (max.zestimate as number) ? p : max
    ).zpid;
  }, [successful]);

  function startElapsedTimer() {
    loadStartRef.current = Date.now();
    setElapsedMs(0);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - loadStartRef.current);
    }, 200);
  }

  function stopElapsedTimer() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }

  function handleChange(index: number, value: string) {
    setAddresses((prev) => prev.map((a, i) => (i === index ? value : a)));
    // Manual edits invalidate any prior place confirmation for that row.
    setConfirmedPlaces((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = false;
      return next;
    });
  }

  // The autocomplete child emits the confirmed formatted address as a plain
  // string. We update the address state here exactly once, marking the row as
  // place-confirmed. The child intentionally does NOT also call onChange when
  // onPlaceSelected is wired, so this is the single source of truth and
  // prevents duplicate state updates / processing.
  function handlePlaceSelected(index: number, formatted: string) {
    setAddresses((prev) => prev.map((a, i) => (i === index ? formatted : a)));
    setConfirmedPlaces((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(false);
      next[index] = true;
      return next;
    });
  }

  function handleAdd() {
    setAddresses((prev) => (prev.length >= 5 ? prev : [...prev, ""]));
    setConfirmedPlaces((prev) => (prev.length >= 5 ? prev : [...prev, false]));
  }

  function handleRemove(index: number) {
    setAddresses((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setConfirmedPlaces((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function runLookup(targets: string[]): Promise<ZillowProperty[]> {
    const res = await fetch("/api/property-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: targets }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 200) {
      throw new Error(data?.error ?? data?.message ?? "Lookup failed");
    }
    if (Array.isArray(data?.properties)) {
      return data.properties as ZillowProperty[];
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return [];
  }

  async function handleCompare() {
    if (validAddresses.length < 2) {
      toast.error("Enter at least 2 addresses to compare.");
      return;
    }
    setLoading(true);
    setResults(null);
    setRetryCooldowns({});
    setRetryAttempts({});
    startElapsedTimer();
    try {
      const properties = await runLookup(validAddresses);
      setResults(properties);
      const okCount = properties.filter((p) => p.status === "ok").length;
      const connErrCount = properties.filter(
        (p) =>
          p.status === "error" &&
          CONNECTION_ERROR_TYPES.has((p.errorType ?? "unknown") as string)
      ).length;
      if (okCount === 0 && connErrCount > 0) {
        toast.error(
          `Couldn't reach Zillow for ${connErrCount} ${
            connErrCount === 1 ? "property" : "properties"
          }. Use "Retry failed" below.`
        );
      } else if (okCount === 0) {
        toast.warning("No properties returned data. Try refining the addresses.");
      } else if (connErrCount > 0) {
        toast.warning(
          `Compared ${okCount}, but ${connErrCount} failed to connect. Retry below.`
        );
      } else {
        toast.success(`Compared ${okCount} ${okCount === 1 ? "property" : "properties"}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch properties";
      toast.error(message);
      setResults(
        validAddresses.map((address) => ({
          zpid: null,
          address,
          price: null,
          zestimate: null,
          bedrooms: null,
          bathrooms: null,
          livingArea: null,
          lotSize: null,
          yearBuilt: null,
          propertyType: null,
          daysOnMarket: null,
          pricePerSqft: null,
          lastSoldPrice: null,
          lastSoldDate: null,
          taxAssessedValue: null,
          photo: null,
          status: "error",
          errorMessage: message,
          errorType: "connection_error",
        }))
      );
    } finally {
      stopElapsedTimer();
      setLoading(false);
    }
  }

  async function handleRetryOne(address: string) {
    if (!results) return;
    const cooldownUntil = retryCooldowns[address] ?? 0;
    if (Date.now() < cooldownUntil) return;

    const attempt = (retryAttempts[address] ?? 0) + 1;
    setRetryAttempts((prev) => ({ ...prev, [address]: attempt }));

    try {
      const next = await runLookup([address]);
      const replacement = next[0];
      if (!replacement) return;

      setResults((prev) =>
        prev ? prev.map((p) => (p.address === address || p.address.trim() === address.trim() ? replacement : p)) : prev
      );

      if (replacement.status === "ok") {
        toast.success(`Retrieved ${replacement.address}`);
        setRetryCooldowns((prev) => {
          const next = { ...prev };
          delete next[address];
          return next;
        });
        setRetryAttempts((prev) => {
          const next = { ...prev };
          delete next[address];
          return next;
        });
      } else if (
        replacement.status === "error" &&
        CONNECTION_ERROR_TYPES.has((replacement.errorType ?? "unknown") as string)
      ) {
        const backoffMs = Math.min(60_000, 5_000 * Math.pow(2, attempt - 1));
        setRetryCooldowns((prev) => ({ ...prev, [address]: Date.now() + backoffMs }));
        toast.error(
          `Still couldn't reach Zillow for this address. Retry in ${Math.ceil(
            backoffMs / 1000
          )}s.`
        );
      } else {
        toast.warning(replacement.errorMessage ?? "No data found.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retry failed";
      toast.error(message);
      const backoffMs = Math.min(60_000, 5_000 * Math.pow(2, attempt - 1));
      setRetryCooldowns((prev) => ({ ...prev, [address]: Date.now() + backoffMs }));
    }
  }

  async function handleRetryAllFailed() {
    if (!results) return;
    const targets = connectionFailed.map((p) => p.address);
    if (targets.length === 0) return;

    toast.info(
      `Retrying ${targets.length} ${targets.length === 1 ? "property" : "properties"}…`
    );

    try {
      const next = await runLookup(targets);
      setResults((prev) => {
        if (!prev) return prev;
        const byAddress = new Map(next.map((p) => [p.address.trim(), p]));
        return prev.map((p) => {
          const replacement =
            byAddress.get(p.address.trim()) ??
            next.find((n) => n.address.trim() === p.address.trim());
          if (
            replacement &&
            p.status === "error" &&
            CONNECTION_ERROR_TYPES.has((p.errorType ?? "unknown") as string)
          ) {
            return replacement;
          }
          return p;
        });
      });

      const okCount = next.filter((p) => p.status === "ok").length;
      const stillFailed = next.filter(
        (p) =>
          p.status === "error" &&
          CONNECTION_ERROR_TYPES.has((p.errorType ?? "unknown") as string)
      ).length;

      if (okCount > 0 && stillFailed === 0) {
        toast.success(`Recovered ${okCount} ${okCount === 1 ? "property" : "properties"}.`);
      } else if (okCount > 0) {
        toast.warning(`Recovered ${okCount}, ${stillFailed} still failing.`);
      } else {
        toast.error(`All ${stillFailed} retries failed. Check RapidAPI status.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk retry failed";
      toast.error(message);
    }
  }

  function handleSave() {
    if (!results || successful.length === 0) {
      toast.error("Nothing to save yet — run a comparison first.");
      return;
    }
    const compared: ComparisonProperty[] = successful.map((p) => ({
      zpid: p.zpid,
      address: p.address,
      price: p.price,
      zestimate: p.zestimate,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      livingArea: p.livingArea,
      lotSize: p.lotSize,
      yearBuilt: p.yearBuilt,
      propertyType: p.propertyType,
      daysOnMarket: p.daysOnMarket,
      pricePerSqft: p.pricePerSqft,
      lastSoldPrice: p.lastSoldPrice,
      lastSoldDate: p.lastSoldDate,
      taxAssessedValue: p.taxAssessedValue,
      photo: p.photo,
    }));
    const label = compared
      .map((p) => p.address)
      .filter(Boolean)
      .slice(0, 2)
      .join(" vs ");
    addComparison(compared, label || undefined);
    toast.success("Comparison saved to your dashboard.");
  }

  function handleClear() {
    setAddresses(["", ""]);
    setConfirmedPlaces([false, false]);
    setResults(null);
    setRetryCooldowns({});
    setRetryAttempts({});
    toast.success("Comparison cleared.");
  }

  function handlePrint() {
    if (!results || successful.length === 0) {
      toast.error("Run a comparison before generating a report.");
      return;
    }
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  }

  const canCompare = validAddresses.length >= 2 && !loading;
  const hasResults = (results?.length ?? 0) > 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const showSlowHint = loading && elapsedSec >= 8;

  void nowTick;

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-2 border-b border-border pb-8 print:hidden"
      >
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Property Comparator</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Side-by-side property analysis
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Enter up to 5 addresses to compare side by side. Start typing — Google
          will suggest matches as you go.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
      >
        <Card className="p-6 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="font-display text-base font-semibold tracking-tight">Addresses</h2>
          </div>
          <AddressInputs
            addresses={addresses}
            onChange={handleChange}
            onAdd={handleAdd}
            onRemove={handleRemove}
            disabled={loading}
            onPlaceSelected={handlePlaceSelected}
          />

          {unconfirmedRows.length > 0 && !loading && (
            <div className="mt-4 rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.06)] p-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Heads up:</span>{" "}
              {unconfirmedRows.length === 1 ? "1 address was" : `${unconfirmedRows.length} addresses were`}{" "}
              typed manually without picking from the Google dropdown. Zillow
              lookups work better with confirmed addresses — keep typing and
              select a suggestion, or proceed anyway.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {validAddresses.length < 2
                ? "Add at least 2 addresses to start comparing."
                : `Ready to compare ${validAddresses.length} ${validAddresses.length === 1 ? "property" : "properties"}.`}
            </p>
            <Button
              onClick={handleCompare}
              disabled={!canCompare}
              loading={loading}
              size="lg"
              className="sm:min-w-[220px]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Compare Properties
            </Button>
          </div>
        </Card>
      </motion.div>

      {loading && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="print:hidden"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fetching properties…
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{elapsedSec}s elapsed</span>
            </div>
          </div>
          {showSlowHint && (
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Still working…</span>{" "}
              First requests can take 15–30s on Vercel cold-starts while RapidAPI warms up.
              If this keeps happening on every compare, check{" "}
              <a
                href="https://rapidapi.com/api-vortex-api-vortex-default/api/zillow-com-live-data-scraper-api"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                RapidAPI status
              </a>
              .
            </div>
          )}
          <div
            className={cn(
              "grid gap-5",
              validAddresses.length <= 2 && "sm:grid-cols-2",
              validAddresses.length === 3 && "sm:grid-cols-2 lg:grid-cols-3",
              validAddresses.length >= 4 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {validAddresses.map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <PropertySkeletonCard />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {!loading && hasResults && results && (
        <>
          {connectionFailed.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="print:hidden"
            >
              <div className="flex flex-col gap-3 rounded-lg border border-[hsl(0_72%_50%/0.4)] bg-[hsl(0_72%_50%/0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {connectionFailed.length} {connectionFailed.length === 1 ? "property" : "properties"}{" "}
                    couldn&apos;t reach Zillow
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Usually a transient RapidAPI hiccup or Vercel cold-start. A bulk retry typically fixes it.
                  </p>
                </div>
                <Button
                  onClick={handleRetryAllFailed}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry failed ({connectionFailed.length})
                </Button>
              </div>
            </motion.section>
          )}

          <section className="print:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Results · {results.length} {results.length === 1 ? "property" : "properties"}
              </h2>
            </div>
            <div
              className={cn(
                "grid gap-5",
                results.length <= 2 && "sm:grid-cols-2",
                results.length === 3 && "sm:grid-cols-2 lg:grid-cols-3",
                results.length >= 4 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}
            >
              {results.map((p, i) => {
                const cooldownUntil = retryCooldowns[p.address] ?? 0;
                const remainingMs = Math.max(0, cooldownUntil - Date.now());
                const remainingSec = Math.ceil(remainingMs / 1000);
                const canRetry =
                  p.status === "error" &&
                  CONNECTION_ERROR_TYPES.has((p.errorType ?? "unknown") as string) &&
                  remainingMs === 0;
                return (
                  <motion.div
                    key={`${p.zpid ?? p.address}-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                  >
                    <PropertyCard
                      property={p}
                      isBestValue={p.status === "ok" && p.zpid !== null && p.zpid === bestValueZpid}
                      isHighestValue={p.status === "ok" && p.zpid !== null && p.zpid === highestValueZpid}
                      onRetry={canRetry ? () => handleRetryOne(p.address) : undefined}
                      retryCountdownSec={remainingSec > 0 ? remainingSec : undefined}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>

          {successful.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              className="print:hidden"
            >
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Comparison table
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Zestimate</th>
                        <th className="px-4 py-3 text-right">Beds</th>
                        <th className="px-4 py-3 text-right">Baths</th>
                        <th className="px-4 py-3 text-right">Sqft</th>
                        <th className="px-4 py-3 text-right">$/Sqft</th>
                        <th className="px-4 py-3 text-right">Year</th>
                        <th className="px-4 py-3 text-right">DOM</th>
                        <th className="px-4 py-3 text-right">Last Sold</th>
                        <th className="px-4 py-3 text-right">Tax Assessed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {successful.map((p, idx) => (
                        <tr
                          key={`${p.zpid ?? p.address}-row-${idx}`}
                          className={cn(
                            "border-b border-border last:border-b-0 transition-colors hover:bg-primary/5",
                            idx % 2 === 1
                              ? "bg-gradient-to-r from-muted/40 to-muted/20"
                              : "bg-background"
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-foreground max-w-[18rem] truncate">
                            {p.address}
                          </td>
                          <td className="px-4 py-3 text-right font-display font-semibold tabular-nums">
                            {formatCurrency(p.price)}
                          </td>
                          <td className="px-4 py-3 text-right font-display tabular-nums">
                            {formatCurrency(p.zestimate)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.bedrooms ?? "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.bathrooms ?? "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {p.livingArea ? p.livingArea.toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {p.pricePerSqft ? `$${p.pricePerSqft.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.yearBuilt ?? "—"}</td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right tabular-nums",
                              (p.daysOnMarket ?? 0) > 60 && "text-destructive font-semibold"
                            )}
                          >
                            {p.daysOnMarket ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {p.lastSoldPrice
                              ? `${formatCurrency(p.lastSoldPrice)}${
                                  p.lastSoldDate ? ` · ${formatDate(p.lastSoldDate)}` : ""
                                }`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(p.taxAssessedValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 print:hidden"
          >
            <Button onClick={handleSave} disabled={successful.length === 0}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save This Comparison
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              loading={printing}
              disabled={successful.length === 0}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Generate Client Report
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </motion.section>

          {successful.length > 0 && (
            <section className="hidden print:block">
              <div className="mb-8 border-b border-black/20 pb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/60">Property Comparison Report</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-black mt-2">
                  {AGENT.name} · {AGENT.title}
                </h1>
                <p className="text-sm text-black/70 mt-1">
                  {AGENT.phone} · {AGENT.email}
                </p>
                <p className="text-xs text-black/60 mt-4">
                  Prepared {formatDate(new Date())}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {successful.map((p, idx) => (
                  <div
                    key={`print-${p.zpid ?? idx}`}
                    className="border border-black/15 p-5 break-inside-avoid"
                  >
                    <p className="text-xs text-black/60 mb-1">Property {idx + 1}</p>
                    <p className="font-display text-sm font-semibold text-black mb-3">{p.address}</p>
                    <p className="font-display text-2xl font-bold text-black tabular-nums">
                      {formatCurrency(p.price ?? p.zestimate)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-black/60">Beds</span><span>{p.bedrooms ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">Baths</span><span>{p.bathrooms ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">Sqft</span><span>{p.livingArea?.toLocaleString() ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">$/sqft</span><span>{p.pricePerSqft ? `$${p.pricePerSqft.toLocaleString()}` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">Year</span><span>{p.yearBuilt ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">DOM</span><span>{p.daysOnMarket ?? "—"}</span></div>
                      <div className="flex justify-between col-span-2"><span className="text-black/60">Zestimate</span><span>{formatCurrency(p.zestimate)}</span></div>
                      <div className="flex justify-between col-span-2"><span className="text-black/60">Tax Assessed</span><span>{formatCurrency(p.taxAssessedValue)}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-10 text-[10px] text-black/50">
                Data sourced from Zillow via RapidAPI. Figures are estimates and should be independently verified.
              </p>
            </section>
          )}
        </>
      )}

      {!loading && !hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="p-12 print:hidden">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Scale className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="font-display text-lg font-semibold">Ready when you are</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Add at least two addresses above and hit Compare to see properties side by side, with Best Value and Highest Value badges auto-applied.
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default PropertyComparatorPage;
