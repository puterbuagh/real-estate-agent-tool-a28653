"use client";

import * as React from "react";
import { Printer, Link2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export interface ReportActionsProps {
  comparisonId: string;
  onReset?: () => void;
}

function ReportActions({ comparisonId, onReset }: ReportActionsProps) {
  const [copying, setCopying] = React.useState(false);

  const handlePrint = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const handleCopyLink = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    setCopying(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("id", comparisonId);
      const link = url.toString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Link copied", {
        description: "Share this URL — the recipient will see the same report.",
      });
    } catch {
      toast.error("Couldn't copy link");
    } finally {
      setCopying(false);
    }
  }, [comparisonId]);

  return (
    <div
      data-print-hide="true"
      className="no-print flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
    >
      <Button onClick={handlePrint} variant="primary">
        <Printer className="h-4 w-4" aria-hidden="true" />
        Print / Save as PDF
      </Button>
      <Button
        onClick={handleCopyLink}
        variant="outline"
        loading={copying}
        disabled={copying}
      >
        <Link2 className="h-4 w-4" aria-hidden="true" />
        Copy shareable link
      </Button>
      {onReset && (
        <Button onClick={onReset} variant="ghost" className="ml-auto">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Choose another
        </Button>
      )}
    </div>
  );
}

export { ReportActions };
export default ReportActions;
