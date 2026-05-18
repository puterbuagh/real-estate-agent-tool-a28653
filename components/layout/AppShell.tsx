"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/property-comparator": "Property Comparator",
  "/pipeline": "My Pipeline",
  "/market-stats": "Market Stats",
  "/client-report": "Client Report",
  "/email-report": "Email Client Report",
  "/profile": "Profile & Branding",
};

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "AgentDesk";

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {/*
        Layout strategy:
        - Sidebar is `fixed left-0 w-64` (16rem / 256px) and only translated in at lg+.
        - We apply `lg:pl-64` directly to <main> so the offset matches the sidebar
          width exactly — no gap, no overlap. Horizontal page padding is handled
          by the inner max-width container via px utilities.
      */}
      <div className="flex min-h-screen flex-col">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          className="flex-1 w-full px-4 py-6 sm:px-6 lg:pl-64 lg:pr-0 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[1600px] lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
