import SignupForm from "@/components/auth/SignupForm";
import AuthCard from "@/components/auth/AuthCard";

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Start building your real estate business with AgentDesk"
    >
      <SignupForm />
    </AuthCard>
  );
}
