import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { PipelineProvider } from '@/context/PipelineContext';
import { AgentBrandingProvider } from '@/context/AgentBrandingContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'AgentDesk — Real Estate Operating System',
  description:
    'AgentDesk is a data-forward workspace for real estate agents: pipeline, comparisons, and live market signals in one place.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <AgentBrandingProvider>
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
        </AgentBrandingProvider>
      </body>
    </html>
  );
}
