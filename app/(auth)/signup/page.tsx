import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import AuthCard from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

function SignupPage() {
  return (
    <AuthCard
      title="Create your AgentDesk"
      subtitle="Set up your agent workspace in under a minute"
    >
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default SignupPage;
