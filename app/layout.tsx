import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { PipelineProvider } from '@/context/PipelineContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'AgentDesk — Real Estate Operating System',
  description:
    'AgentDesk is a data-forward workspace for real estate agents: pipeline, comparisons, and live market signals in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PipelineProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </PipelineProvider>
      </body>
    </html>
  );
}
