import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed border-border bg-card/40",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
          <Icon size={24} aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;
export { EmptyState };
