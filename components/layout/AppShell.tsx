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
    <div
      className="min-h-screen bg-background"
      style={{
        display: "grid",
        gridTemplateColumns: "256px 1fr",
        minHeight: "100vh",
      }}
    >
      <div className="hidden lg:block">
        <Sidebar mobileOpen={false} onClose={() => setMobileOpen(false)} />
      </div>
      <div className="lg:hidden" style={{ display: "contents" }}>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
      <div
        className="flex flex-col min-w-0 overflow-x-hidden"
        style={{ gridColumn: "2 / 3" }}
      >
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          style={{ flex: 1, overflowY: "auto", padding: "2rem", minWidth: 0 }}
        >
          <div
            style={{
              margin: "0 auto",
              width: "100%",
              maxWidth: "1600px",
              minWidth: 0,
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
