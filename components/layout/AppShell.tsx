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
        - Sidebar is `fixed left-0 w-64` and only visible (translated in) at lg+.
        - On mobile/tablet, the sidebar is offscreen, so main content uses the full viewport width.
        - At lg+, we offset the main column by exactly 16rem (w-64) using `lg:ml-64`.
        - We do NOT use `mx-auto` on <main> because that would re-center within the viewport and
          visually ignore the sidebar offset. Instead we cap width and align with `max-w-[1600px]`.
      */}
      <div className="flex min-h-screen flex-col lg:ml-64">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          className="flex-1 w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
