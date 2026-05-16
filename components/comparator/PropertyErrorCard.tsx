import { AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyErrorCardProps {
  address: string;
  variant: "no_data" | "error";
  message?: string;
}

function PropertyErrorCard({ address, variant, message }: PropertyErrorCardProps) {
  const isNoData = variant === "no_data";
  const Icon = isNoData ? AlertTriangle : WifiOff;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card overflow-hidden",
        isNoData
          ? "border-[hsl(38_92%_50%/0.4)]"
          : "border-[hsl(0_72%_50%/0.4)]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider",
          isNoData
            ? "bg-[hsl(38_92%_50%/0.12)] text-[hsl(35_85%_35%)]"
            : "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]"
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {isNoData ? "No data found" : "Data unavailable"}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-sm font-medium text-foreground break-words">
          {address}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isNoData
            ? "No data found for this address. Double-check the spelling, ZIP code, and that it's a U.S. residential property."
            : message ?? "Data unavailable — check your connection and try again."}
        </p>
        <div className="mt-auto pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Other properties in this comparison are unaffected.
          </p>
        </div>
      </div>
    </div>
  );
}

export { PropertyErrorCard };
export default PropertyErrorCard;
