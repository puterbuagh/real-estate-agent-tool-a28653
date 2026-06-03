import { cn, formatCurrency } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

interface ComparisonTableProps {
  properties: ZillowProperty[];
}

function formatNum(n: number | null | undefined, suffix = ""): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "\u2014";
  return `${new Intl.NumberFormat("en-US").format(n)}${suffix}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "\u2014";
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
    displayFont?: boolean;
    numeric?: boolean;
  }> = [
    {
      key: "address",
      label: "Address",
      render: (p) => (
        <span className="font-medium text-foreground">{p.address}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (p) => formatCurrency(p.price),
      displayFont: true,
      numeric: true,
    },
    {
      key: "zestimate",
      label: "Zestimate",
      render: (p) => formatCurrency(p.zestimate),
      highlight: (p) =>
        Number.isFinite(highestZest) && p.zestimate === highestZest,
      displayFont: true,
      numeric: true,
    },
    { key: "beds", label: "Beds", render: (p) => formatNum(p.bedrooms), numeric: true },
    { key: "baths", label: "Baths", render: (p) => formatNum(p.bathrooms), numeric: true },
    {
      key: "sqft",
      label: "Sqft",
      render: (p) => formatNum(p.livingArea),
      numeric: true,
    },
    {
      key: "ppsf",
      label: "$/Sqft",
      render: (p) =>
        p.pricePerSqft ? `$${formatNum(p.pricePerSqft)}` : "\u2014",
      highlight: (p) =>
        Number.isFinite(lowestPpsf) && p.pricePerSqft === lowestPpsf,
      displayFont: true,
      numeric: true,
    },
    {
      key: "lot",
      label: "Lot",
      render: (p) =>
        p.lotSize === null || p.lotSize === undefined
          ? "\u2014"
          : typeof p.lotSize === "number"
          ? formatNum(p.lotSize, " sqft")
          : String(p.lotSize),
      numeric: true,
    },
    {
      key: "year",
      label: "Year",
      render: (p) => formatNum(p.yearBuilt),
      numeric: true,
    },
    {
      key: "type",
      label: "Type",
      render: (p) => p.propertyType ?? "\u2014",
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
      numeric: true,
    },
    {
      key: "lastSold",
      label: "Last Sold",
      render: (p) =>
        p.lastSoldPrice
          ? `${formatCurrency(p.lastSoldPrice)} \u00b7 ${formatDate(p.lastSoldDate)}`
          : "\u2014",
      displayFont: true,
    },
    {
      key: "tax",
      label: "Tax Assessed",
      render: (p) => formatCurrency(p.taxAssessedValue),
      displayFont: true,
      numeric: true,
    },
  ];

  return (
    <section className="w-full max-w-[calc(100vw-2rem)] md:max-w-full rounded-lg border border-border bg-card overflow-hidden">
      <header className="border-b border-border px-6 py-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Scan view
        </p>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground mt-1">
          Side-by-side metrics
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Every property, every metric \u2014 for fast scanning.
        </p>
      </header>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-b from-muted/60 to-muted/20">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 whitespace-nowrap",
                    "font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                    c.numeric ? "text-right" : "text-left"
                  )}
                >
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
                  "border-b border-border last:border-b-0 transition-colors hover:bg-primary/[0.02]",
                  idx % 2 === 1 && "bg-gradient-to-r from-muted/30 via-muted/40 to-muted/30"
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 align-top whitespace-nowrap text-foreground",
                      c.numeric && "text-right tabular-nums",
                      c.displayFont && "font-display",
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
