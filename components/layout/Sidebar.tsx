"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitCompare,
  Briefcase,
  BarChart3,
  FileText,
  Mail,
  X,
  Building2,
  UserCog,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentBranding } from "@/context/AgentBrandingContext";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/property-comparator", label: "Property Comparator", icon: GitCompare },
  { href: "/pipeline", label: "My Pipeline", icon: Briefcase },
  { href: "/market-stats", label: "Market Stats", icon: BarChart3 },
  { href: "/client-report", label: "Client Report", icon: FileText },
  { href: "/email-report", label: "Email Client Report", icon: Mail },
];

const settingsItems = [
  { href: "/profile", label: "Profile & Branding", icon: UserCircle2 },
];

function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { branding, initials, isConfigured } = useAgentBranding();

  const isProfileActive = pathname.startsWith("/profile");

  const displayName =
    (branding.name ?? "").trim() || "Set up your profile";
  const displaySub = (() => {
    if (!isConfigured) return "Click to add your details";
    if (branding.brokerage && branding.brokerage.trim()) {
      return branding.brokerage;
    }
    if (branding.email && branding.email.trim()) {
      return branding.email;
    }
    return "Realtor®";
  })();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 max-w-[80vw] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 ease-out",
          "grain-overlay",
          "lg:translate-x-0 lg:max-w-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative z-10 flex items-center justify-between px-6 h-16 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_12px_hsl(var(--primary)/0.3)]">
              <Building2
                className="h-4 w-4 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-lg font-semibold tracking-tight truncate">
                AgentDesk
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/40 mt-0.5">
                v1.0 · ohio
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          <div className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
            Workspace
          </div>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-sidebar-foreground border-l-2 border-primary -ml-[2px] pl-[10px]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
            Settings
          </div>
          <ul className="space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-sidebar-foreground border-l-2 border-primary -ml-[2px] pl-[10px]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                    {!isConfigured && item.href === "/profile" && (
                      <span
                        className="ml-auto inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse"
                        aria-label="Profile incomplete"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative z-10 border-t border-sidebar-border p-3 shrink-0">
          <Link
            href="/profile"
            onClick={onClose}
            aria-label="Edit agent profile"
            title={
              isConfigured
                ? `Signed in as ${branding.name}`
                : "Set up your profile"
            }
            className={cn(
              "group flex items-center gap-3 rounded-md p-2 transition-colors",
              "hover:bg-sidebar-foreground/5",
              isProfileActive && "bg-sidebar-foreground/5"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-sm font-semibold tracking-tight",
                isConfigured
                  ? "bg-primary/20 text-sidebar-foreground ring-1 ring-primary/30"
                  : "bg-sidebar-foreground/10 text-sidebar-foreground/70"
              )}
              aria-hidden="true"
            >
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display truncate text-sm font-medium text-sidebar-foreground tracking-tight">
                {displayName}
              </div>
              <div className="truncate text-xs text-sidebar-foreground/50">
                {displaySub}
              </div>
            </div>
            <UserCog
              className="h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-colors group-hover:text-sidebar-foreground/80"
              aria-hidden="true"
            />
          </Link>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
