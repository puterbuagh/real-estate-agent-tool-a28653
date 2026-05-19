import type { ReactNode } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

export const metadata = {
  title: "AgentDesk — Sign in",
};

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--foreground)/0.08)_1px,transparent_0)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_12px_hsl(var(--primary)/0.3)]">
              <Building2
                className="h-4 w-4 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                AgentDesk
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                v1.0 · ohio
              </span>
            </div>
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-6 pb-16 md:items-center md:px-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground md:px-10">
          © {new Date().getFullYear()} AgentDesk · Built for Ohio real estate
          professionals
        </footer>
      </div>
    </div>
  );
}

export default AuthLayout;
