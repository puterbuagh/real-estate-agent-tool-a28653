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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: "256px",
          minWidth: 0,
        }}
      >
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          data-app-main="true"
          style={{ flex: 1, overflowY: "auto", padding: "2rem", minWidth: 0 }}
        >
          <div style={{ margin: "0 auto", width: "100%", maxWidth: "1600px", minWidth: 0 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
