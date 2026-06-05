import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  redirect("/");
  return <>{children}</>;
}
