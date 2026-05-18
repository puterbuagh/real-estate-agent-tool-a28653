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
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className="hidden lg:flex w-64 shrink-0 flex-none">
        <Sidebar mobileOpen={false} onClose={() => {}} />
      </aside>
      <div className="lg:hidden">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto w-full max-w-[1600px] min-w-0 p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
