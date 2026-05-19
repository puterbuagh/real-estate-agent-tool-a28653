import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import AuthCard from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your AgentDesk workspace"
    >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

export default LoginPage;
