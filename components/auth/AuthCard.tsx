import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-accent/30 opacity-60 blur-md"
      />
      <div className="relative rounded-2xl border border-border bg-card/95 p-8 shadow-[0_30px_60px_-30px_hsl(var(--foreground)/0.25)] backdrop-blur-md md:p-10">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Agent portal
          </span>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthCard;
