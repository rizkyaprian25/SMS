import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
import { LayoutShell } from '@/components/layout-shell';

export const metadata: Metadata = {
  title: 'SMS SMP Negeri — Dashboard Terpadu',
  description: 'Web dashboard Admin & Kepala Sekolah SMP Negeri',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
