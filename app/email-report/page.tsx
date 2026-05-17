import { Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const PLACEHOLDER_EMAIL_REPORT = {
  status: "in_development" as const,
  heading: "In development",
  description:
    "This feature will let you pick a saved comparison, customize the cover note, and email a branded report directly to your client. We'll wire it up to Resend once the template designs are locked.",
  features: [
    {
      title: "Branded cover",
      body: "Your logo, your colors, your contact info — auto-applied.",
    },
    {
      title: "Side-by-side comparison",
      body: "All key metrics from the comparator, formatted for clients.",
    },
    {
      title: "One-click send",
      body: "Email straight from AgentDesk. No copy-paste, no PDF gymnastics.",
    },
  ],
};

function EmailReportPage() {
  const data = PLACEHOLDER_EMAIL_REPORT;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Stretch Goal
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Email Client Report
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Generate a polished PDF/email report of a property comparison and send
          it to your client in one click.
        </p>
      </header>

      <Card className="p-10">
        <div className="max-w-lg">
          <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
            <Mail className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {data.heading}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">{data.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled>
              <Sparkles className="size-4" /> Generate Sample Report
            </Button>
            <Button variant="secondary" disabled>
              Configure Email Settings
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {data.features.map((f) => (
          <Card key={f.title} className="p-5">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
              {f.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {f.body}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default EmailReportPage;
