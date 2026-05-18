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
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen w-full max-w-full flex-col lg:pl-64">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
