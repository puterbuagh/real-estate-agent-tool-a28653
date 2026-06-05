import AuthCard from "@/components/auth/AuthCard";
import DemoLoginForm from "@/components/auth/DemoLoginForm";

export default function DemoPage() {
  return (
    <AuthCard
      title="Demo Access"
      subtitle="Explore AgentDesk with a pre-configured demo account."
    >
      <DemoLoginForm />
    </AuthCard>
  );
}
