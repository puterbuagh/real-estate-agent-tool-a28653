"use client";

import { Menu } from "lucide-react";

interface TopBarProps {
  title?: string;
  onMenuClick: () => void;
}

function TopBar({ title = "Dashboard", onMenuClick }: TopBarProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          ·
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {today}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">Live</span>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
