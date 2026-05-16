"use client";

import { useMemo, useState } from "react";
import { Scale, Save, Printer, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import AddressInputs from "@/components/comparator/AddressInputs";
import PropertyCard from "@/components/comparator/PropertyCard";
import PropertySkeletonCard from "@/components/comparator/PropertySkeletonCard";
import { usePipeline } from "@/context/PipelineContext";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

const AGENT = {
  name: "Jordan Miller",
  title: "Ohio Realtor®",
  phone: "(614) 555-0142",
  email: "jordan@agentdesk.app",
};

function PropertyComparatorPage() {
  const { addComparison } = usePipeline();
  const [addresses, setAddresses] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<ZillowProperty[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const validAddresses = useMemo(
    () => addresses.map((a) => a.trim()).filter((a) => a.length > 0),
    [addresses]
  );

  const successful = useMemo(
    () => (results ?? []).filter((p): p is ZillowProperty => p.status === "ok"),
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

  function handleChange(index: number, value: string) {
    setAddresses((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function handleAdd() {
    setAddresses((prev) => (prev.length >= 5 ? prev : [...prev, ""]));
  }

  function handleRemove(index: number) {
    setAddresses((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleCompare() {
    if (validAddresses.length < 2) {
      toast.error("Enter at least 2 addresses to compare.");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/property-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: validAddresses }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Lookup failed");
      }
      const properties: ZillowProperty[] = data.properties ?? [];
      setResults(properties);
      const okCount = properties.filter((p) => p.status === "ok").length;
      if (okCount === 0) {
        toast.warning("No properties returned data. Try refining the addresses.");
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
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!results || successful.length === 0) {
      toast.error("Nothing to save yet — run a comparison first.");
      return;
    }
    const compared = successful.map((p) => ({
      address: p.address,
      zestimate: p.zestimate,
    }));
    const winner = [...successful]
      .filter((p) => typeof p.zestimate === "number")
      .sort((a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0))[0];
    addComparison({
      properties: compared,
      winnerAddress: winner?.address ?? null,
      winnerZestimate: winner?.zestimate ?? null,
    });
    toast.success("Comparison saved to your dashboard.");
  }

  function handleClear() {
    setAddresses(["", ""]);
    setResults(null);
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-border pb-8 print:hidden">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Property Comparator</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Side-by-side property analysis
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Enter up to 5 addresses to compare side by side.
        </p>
      </header>

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
        />
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

      {loading && (
        <section className="print:hidden">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Fetching properties…
          </h2>
          <div
            className={cn(
              "grid gap-5",
              validAddresses.length <= 2 && "sm:grid-cols-2",
              validAddresses.length === 3 && "sm:grid-cols-2 lg:grid-cols-3",
              validAddresses.length >= 4 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {validAddresses.map((_, i) => (
              <PropertySkeletonCard key={i} />
            ))}
          </div>
        </section>
      )}

      {!loading && hasResults && results && (
        <>
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
              {results.map((p, i) => (
                <PropertyCard
                  key={`${p.zpid ?? p.address}-${i}`}
                  property={p}
                  isBestValue={p.status === "ok" && p.zpid !== null && p.zpid === bestValueZpid}
                  isHighestValue={p.status === "ok" && p.zpid !== null && p.zpid === highestValueZpid}
                />
              ))}
            </div>
          </section>

          {successful.length > 0 && (
            <section className="print:hidden">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Comparison table
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                            "border-b border-border last:border-b-0",
                            idx % 2 === 1 && "bg-muted/30"
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-foreground max-w-[18rem] truncate">
                            {p.address}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.price)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.zestimate)}</td>
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
            </section>
          )}

          <section className="flex flex-wrap items-center gap-3 print:hidden">
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
          </section>

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
      )}
    </div>
  );
}

export default PropertyComparatorPage;
