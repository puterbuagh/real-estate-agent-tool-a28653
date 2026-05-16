import { cn, formatCurrency } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

interface ComparisonTableProps {
  properties: ZillowProperty[];
}

function formatNum(n: number | null | undefined, suffix = ""): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("en-US").format(n)}${suffix}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ComparisonTable({ properties }: ComparisonTableProps) {
  const usable = properties.filter((p) => p.status === "ok");
  if (usable.length === 0) return null;

  const lowestPpsf = Math.min(
    ...usable
      .map((p) => p.pricePerSqft)
      .filter((v): v is number => typeof v === "number" && v > 0)
  );
  const highestZest = Math.max(
    ...usable
      .map((p) => p.zestimate)
      .filter((v): v is number => typeof v === "number" && v > 0)
  );

  const columns: Array<{
    key: string;
    label: string;
    render: (p: ZillowProperty) => React.ReactNode;
    highlight?: (p: ZillowProperty) => boolean;
  }> = [
    {
      key: "address",
      label: "Address",
      render: (p) => (
        <span className="font-medium text-foreground">{p.address}</span>
      ),
    },
    { key: "price", label: "Price", render: (p) => formatCurrency(p.price) },
    {
      key: "zestimate",
      label: "Zestimate",
      render: (p) => formatCurrency(p.zestimate),
      highlight: (p) =>
        Number.isFinite(highestZest) && p.zestimate === highestZest,
    },
    { key: "beds", label: "Beds", render: (p) => formatNum(p.bedrooms) },
    { key: "baths", label: "Baths", render: (p) => formatNum(p.bathrooms) },
    {
      key: "sqft",
      label: "Sqft",
      render: (p) => formatNum(p.livingArea),
    },
    {
      key: "ppsf",
      label: "$/Sqft",
      render: (p) =>
        p.pricePerSqft ? `$${formatNum(p.pricePerSqft)}` : "—",
      highlight: (p) =>
        Number.isFinite(lowestPpsf) && p.pricePerSqft === lowestPpsf,
    },
    {
      key: "lot",
      label: "Lot",
      render: (p) =>
        p.lotSize === null || p.lotSize === undefined
          ? "—"
          : typeof p.lotSize === "number"
          ? formatNum(p.lotSize, " sqft")
          : String(p.lotSize),
    },
    {
      key: "year",
      label: "Year",
      render: (p) => formatNum(p.yearBuilt),
    },
    {
      key: "type",
      label: "Type",
      render: (p) => p.propertyType ?? "—",
    },
    {
      key: "dom",
      label: "DOM",
      render: (p) => (
        <span
          className={cn(
            "tabular-nums",
            typeof p.daysOnMarket === "number" && p.daysOnMarket > 60
              ? "text-destructive font-semibold"
              : ""
          )}
        >
          {formatNum(p.daysOnMarket)}
        </span>
      ),
    },
    {
      key: "lastSold",
      label: "Last Sold",
      render: (p) =>
        p.lastSoldPrice
          ? `${formatCurrency(p.lastSoldPrice)} · ${formatDate(p.lastSoldDate)}`
          : "—",
    },
    {
      key: "tax",
      label: "Tax Assessed",
      render: (p) => formatCurrency(p.taxAssessedValue),
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="border-b border-border px-6 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Side-by-side metrics
        </h2>
        <p className="text-xs text-muted-foreground">
          Every property, every metric — for fast scanning.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usable.map((p, idx) => (
              <tr
                key={p.zpid ?? `${p.address}-${idx}`}
                className={cn(
                  "border-b border-border last:border-b-0",
                  idx % 2 === 1 && "bg-muted/40"
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 align-top whitespace-nowrap text-foreground",
                      c.highlight?.(p) &&
                        "bg-primary/5 font-semibold text-primary"
                    )}
                  >
                    {c.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { ComparisonTable };
export default ComparisonTable;
