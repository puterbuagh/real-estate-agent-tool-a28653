"use client";

import Link from "next/link";
import { Menu, UserCircle2 } from "lucide-react";
import { useAgentBranding } from "@/context/AgentBrandingContext";

interface TopBarProps {
  title?: string;
  onMenuClick: () => void;
}

function TopBar({ title = "Dashboard", onMenuClick }: TopBarProps) {
  const { branding, initials, hasProfile } = useAgentBranding();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full max-w-full items-center gap-4 overflow-x-hidden border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6 lg:pl-[17rem] lg:pr-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground/70 hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground truncate sm:text-2xl">
          {title}
        </h1>
        <span
          className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40 sm:inline-block"
          aria-hidden="true"
        />
        <span className="hidden truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          {today}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 backdrop-blur md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Live
          </span>
        </div>

        <Link
          href="/profile"
          aria-label="Edit your agent profile"
          title={hasProfile ? `Signed in as ${branding.name}` : "Set up your profile"}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-2 py-1 pr-3 text-sm text-foreground backdrop-blur transition-colors hover:bg-accent"
        >
          {hasProfile ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-display text-[11px] font-semibold text-primary">
              {initials}
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="hidden max-w-[8rem] truncate text-xs font-medium sm:inline">
            {hasProfile ? branding.name : "Set up profile"}
          </span>
        </Link>
      </div>
    </header>
  );
}

export default TopBar;
