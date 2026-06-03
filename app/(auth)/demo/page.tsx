import Link from "next/link";
import { Building2 } from "lucide-react";
import DemoLoginForm from "@/components/auth/DemoLoginForm";
import AuthCard from "@/components/auth/AuthCard";

export const metadata = {
  title: "Demo Login · AgentDesk",
  description: "Try AgentDesk with a pre-populated demo account",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 mb-8"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_12px_hsl(var(--primary)/0.3)]">
            <Building2
              className="h-5 w-5 text-primary-foreground"
              strokeWidth={2.5}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-2xl font-semibold tracking-tight">
              AgentDesk
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              demo mode
            </span>
          </div>
        </Link>

        <AuthCard>
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                Try AgentDesk Demo
              </h1>
              <p className="text-sm text-muted-foreground">
                Explore the platform with a pre-populated account
              </p>
            </div>

            <DemoLoginForm />

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Want your own account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </AuthCard>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            This demo account includes sample properties and data to showcase
            AgentDesk features.
          </p>
          <p>No real client information is stored or shared.</p>
        </div>
      </div>
    </div>
  );
}
