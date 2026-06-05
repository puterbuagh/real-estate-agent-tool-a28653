import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
